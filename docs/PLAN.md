# Plan: IRIS Architecture (Updated)

## Objective
Create a modern, lightweight, and high-performance IITC alternative. Current focus is a **Desktop Proof of Concept (POC)** as a Browser Extension (Manifest V3) that acts as a "Master Map" overlaying the original Ingress Intel map.

## Technical Stack
- **Framework:** Preact (UI) + Zustand (State).
- **Build Tool:** Vite + `vite-plugin-web-extension`.
- **Mapping Engine:** MapLibre GL JS (WebGL-accelerated).
- **Basemap:** CartoDB Positron (CORS-friendly).
- **Sync Method:** Bi-directional event bridging between MapLibre and Google Maps (Intel).

## Implementation Status

### Phase 1: Core & Data Capture (100% Complete)
- [x] Monorepo & Extension Skeleton.
- [x] "Main World" Interceptor for `/r/getEntities`, `/r/getPortalDetails`, and `/r/getPlexts`.
- [x] Support for Portals, Links, Fields, and Machina (Red) faction.
- [x] Zero-log performance optimization for high-density areas.
- [x] Automated `getPlexts` triggering on init/move/open with 5s cooldown.

### Phase 2: Map Rendering (100% Complete)
- [x] MapLibre GL Overlay with CartoDB Positron Basemap.
- [x] **Bi-directional Sync:** Panning IRIS moves Intel; Intel fetches data -> IRIS renders. Cross-browser compatibility fixes for event handling (e.g., Firefox).
- [x] Persistent View: Map stays alive and synced when toggled hidden.
- [x] Modern Dark-Mode aesthetic with faction-themed WebGL layers.

### Phase 3: Plugin System (80% Complete)
- [x] SDK Definition: Types for Portals, Links, Fields.
- [x] UI Hooks: `api.ui.addStatsItem` for dynamic overlay content.
- [x] Sample Plugin: `portal-names` logger and UI stats integration.
- [x] `player-tracker` plugin using plext movement data.
- [ ] **Next:** Support for custom map layers from plugins.
- [ ] **Next:** Dynamic plugin loading (loading external JS files).

### Phase 4: Refinement & Mobile (90% Complete)
- [x] **UI Polish:** Portal detail popups (clickable portals).
- [x] **Network Monitoring:** Integrated Status Bar with real-time logs for OK/FAILED/JS errors.
- [x] **Firefox Mobile:** `world: MAIN` support and robust interception for Android.
- [x] **Manual Controls:** "REFRESH" button in COMM for on-demand polling.
- [ ] **Next:** Color all player names with team color across the UI.
- [ ] **Next:** Update `CommPopup` to show group (filter) messages by "All", "Faction", and "Alerts".
- [ ] **Next:** Fix scrollbar issue in `PortalInfoPopup` (ensure it doesn't show redundant scrollbars).
- [ ] **Next:** Add a popup to choose map theme (e.g., 'roads', 'terrain', 'satellite').

### Phase 5: Advanced Features (20% Complete)
- [x] **Player Tracker:** Track player movement based on COMM (plexts) activity. Draw lines between portals for recent activity.
- [ ] **Data Export:** Export captured portal/link/field data to standard formats (JSON/KML).
- [ ] **Path Prediction:** Speculative pathing for players based on historical patterns.

## Performance & Scalability Roadmap (Upcoming)

To handle extremely dense areas (thousands of entities), we will implement the following:

| Feature | Description | Benefit |
|---|---|---|
| **Viewport Clipping** | Only send entities within `map.getBounds()` to the MapLibre source. | Reduces JS -> GPU serialization overhead. |
| **Spatial Index (RBush)** | Store all entities in a 2D R-Tree for instant bounding-box queries. | Makes viewport clipping $O(\log N)$ instead of $O(N)$. |
| **Update Throttling** | Limit `GeoJSONSource.setData` calls to once every 100ms. | Prevents rendering jank during rapid panning. |
| **Stale Data Eviction** | Automatically remove entities from store if they are far from view. | Maintains constant memory footprint for long sessions. |
| **GeoJSON-VT Tuning** | Simplify geometry (tolerance/buffer) at lower zoom levels. | Reduces vertex count for the GPU to process. |

## Current Working Logic
1. **Intercept:** Catch raw JSON from Niantic (XHR/Fetch).
2. **Store:** Normalize into Zustand (`@iris/core`).
3. **Master Sync:** MapLibre (top layer) captures user input, sends `move` commands to the Google Maps instance (bottom layer).
4. **Proactive Trigger:** IRIS triggers its own API calls (e.g., `getPlexts`) on map movement if no vanilla request has happened recently (5s cooldown).
5. **Monitoring:** All network and JS errors are caught by the interceptor and surfaced in the Status Bar for real-time debugging.

## Verification & Testing
- **Network:** Cooldown logic prevents request spam.
- **Mobile:** Verified on Firefox Nightly (Android) with proactive COMM polling.
- **Accuracy:** Anchor-bottom markers ensure pins point exactly at portals.
- **Types:** Strict TypeScript validation across all plugins and core logic.
