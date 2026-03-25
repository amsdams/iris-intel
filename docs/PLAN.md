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

### Phase 3: Plugin System (90% Complete)
- [x] SDK Definition: Types for Portals, Links, Fields.
- [x] UI Hooks: `api.ui.addStatsItem` for dynamic overlay content.
- [x] `player-tracker` plugin with movement paths, faction-colored pins, and time-based fading (1h expiration).
- [x] **Plugin API Expansion:** Exposed `api.utils.normalizeTeam` and `api.ui.getThemeColors` for consistent coloring across plugins.
- [ ] **Next:** Support for custom map layers from plugins.
- [ ] **Next:** Dynamic plugin loading (loading external JS files).

### Phase 4: Refinement & Mobile (100% Complete)
- [x] **UI Polish:** Portal detail popups (clickable portals).
- [x] **Player Name Coloring:** Unified team colors across all UI components (Portals, Comm, Stats).
- [x] **Tabbed COMM:** Dedicated tabs for ALL, FACTION, and ALERTS messages using categories (1, 2, 4).
- [x] **Interactivity in COMM:** Clickable portal names and link events for instant map navigation.
- [x] **Network Monitoring:** Integrated Status Bar with real-time logs for OK/FAILED/JS errors.
- [x] **Faction Consistency:** Unified team normalization (MACHINA/MAC/ALIENS) across entire UI.
- [x] **Fix scrollbar issue:** Resolved redundant scrollbars in `PortalInfoPopup` and other popups.
- [x] **Map Theme Picker:** Added a popup to choose map theme (Light, Dark, Voyager, OSM).
- [x] **CSS Centralization:** Migrated inline styles for core UI components (Popup, Topbar, Search, Menus) to a unified `iris.css` to improve maintainability and decouple layout from logic.
- [x] **Development Workflow:** Formalized "Allowed/Preferred Commands" in `GEMINI.md` to ensure consistent build and release processes across sessions.
- [x] **UI Refinement:** Move the Profile/Player Stats button from the Topbar into the main Menu to declutter the header.
- [x] **Mobile Fix:** Optimize `PortalInfoPopup` for mobile; ensure large portal images don't push the popup off-screen (responsive image sizing).
- [ ] **Next:** Performance: GeoJSON source throttling for extremely dense areas.
- [ ] **Next:** Mobile Strategy: Decision between Capacitor App vs. Mobile Browser Extension.

### Phase 5: Advanced Features (20% Complete)
- [x] **Player Tracker:** Track player movement based on COMM (plexts) activity. Draw lines between portals for recent activity.
- [ ] **Data Export:** Export captured portal/link/field data to standard formats (JSON/KML).
- [ ] **Path Prediction:** Speculative pathing for players based on historical patterns.

## Known Issues & Mobile Challenges

| Environment | Issue | Status |
|---|---|---|
| **Mobile Firefox** | **Player Tracker Missing:** Markers/Lines are not appearing on mobile builds despite working on desktop. | *Investigating* |
| **Mobile Firefox** | **Stale COMM Messages:** Initial COMM fetch on mobile often returns very old messages compared to desktop chrome/firefox. | *Note: Likely due to Intel initial response definition* |
| **All Firefox** | **Security Restrictions:** Accessing `.constructor` on MapLibre objects is blocked. | *Mitigated via manual interaction layer* |

## Current Working Logic
1. **Intercept:** Catch raw JSON from Niantic (XHR/Fetch).
2. **Store:** Normalize into Zustand (`@iris/core`). Handles adds, updates, and deletions.
3. **Master Sync:** MapLibre (top layer) captures user input, sends `move` commands to the Google Maps instance.
4. **Proactive Trigger:** IRIS triggers its own API calls (e.g., `getPlexts`) on map movement with 5s cooldown.
5. **Monitoring:** All network and JS errors are surfaced in the Status Bar.

## Verification & Testing
- **Network:** Cooldown logic prevents request spam. Dual-tab polling (all/faction) for COMM.
- **Accuracy:** Native MapLibre layer events avoided in favor of manual projection for maximum cross-browser stability.
- **Types:** Strict TypeScript validation across all plugins and core logic.
