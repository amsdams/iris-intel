# Project Status

This document tracks the major completed tasks and the next priorities for the project. For a more detailed breakdown, see [PLAN.md](PLAN.md).

## ✅ Completed

- **Core & Data Capture:**
    - [x] Monorepo & Extension Skeleton.
    - [x] "Main World" Interceptor for `/r/getEntities` and `/r/getPortalDetails`.
    - [x] Support for Portals, Links, Fields, and Machina (Red) faction.
    - [x] Zero-log performance optimization for high-density areas.

- **Map Rendering:**
    - [x] MapLibre GL Overlay with OSM Basemap.
    - [x] **Bi-directional Sync:** Panning IRIS moves Intel; Intel fetches data -> IRIS renders. Cross-browser compatibility fixes for event handling (e.g., Firefox).
    - [x] Persistent View: Map stays alive and synced when toggled hidden.
    - [x] Modern Dark-Mode aesthetic with faction-themed WebGL layers.

- **Plugin System (Base):**
    - [x] SDK Definition: Types for Portals, Links, Fields.
    - [x] UI Hooks: `api.ui.addStatsItem` for dynamic overlay content.
    - [x] Sample Plugin: `portal-names` logger and UI stats integration.

- **Refinement:**
    - [x] **UI Polish:** Portal detail popups (clickable portals).


## 🎯 Next Priorities

### Plugin System
- [ ] **Next:** Support for custom map layers from plugins.
- [ ] **Next:** Dynamic plugin loading (loading external JS files).

### Refinement & Mobile
- [ ] **Next:** Color all player names with team color across the UI.
- [ ] **Next:** Update `CommPopup` to show group (filter) messages by "all", "faction" and "alerts".
- [ ] **Next:** Fix scrollbar issue in `PortalInfoPopup`.
- [ ] **Next:** Add Map Theme picker popup (roads, terrain, etc.).
- [ ] **Performance:** GeoJSON source throttling for extremely dense areas.
- [ ] **Mobile Strategy:** Decision between Capacitor App vs. Mobile Browser Extension.

### Advanced Features
- [ ] **Player Tracker:** Interaction-based tracking from COMM activity.
- [ ] **Data Export:** Support for JSON/KML exports.
