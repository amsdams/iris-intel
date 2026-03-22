# Plan: IRIS Architecture (Updated)

## Objective
Create a modern, lightweight, and high-performance IITC alternative. Current focus is a **Desktop Proof of Concept (POC)** as a Browser Extension (Manifest V3) that acts as a "Master Map" overlaying the original Ingress Intel map.

## Technical Stack
- **Framework:** Preact (UI) + Zustand (State).
- **Build Tool:** Vite + `vite-plugin-web-extension`.
- **Mapping Engine:** MapLibre GL JS (WebGL-accelerated).
- **Basemap:** OpenStreetMap (Raster).
- **Sync Method:** Bi-directional event bridging between MapLibre and Google Maps (Intel).

## Implementation Status

### Phase 1: Core & Data Capture (100% Complete)
- [x] Monorepo & Extension Skeleton.
- [x] "Main World" Interceptor for `/r/getEntities` and `/r/getPortalDetails`.
- [x] Support for Portals, Links, Fields, and Machina (Red) faction.
- [x] Zero-log performance optimization for high-density areas.

### Phase 2: Map Rendering (100% Complete)
- [x] MapLibre GL Overlay with OSM Basemap.
- [x] **Bi-directional Sync:** Panning IRIS moves Intel; Intel fetches data -> IRIS renders. Cross-browser compatibility fixes for event handling (e.g., Firefox).
- [x] Persistent View: Map stays alive and synced when toggled hidden.
- [x] Modern Dark-Mode aesthetic with faction-themed WebGL layers.

### Phase 3: Plugin System (75% Complete)
- [x] SDK Definition: Types for Portals, Links, Fields.
- [x] UI Hooks: `api.ui.addStatsItem` for dynamic overlay content.
- [x] Sample Plugin: `portal-names` logger and UI stats integration.
- [ ] **Next:** Support for custom map layers from plugins.
- [ ] **Next:** Dynamic plugin loading (loading external JS files).

### Phase 4: Refinement & Mobile (50% Complete)
- [x] **UI Polish:** Portal detail popups (clickable portals).
- [ ] **Performance:** GeoJSON source throttling for extremely dense areas.
- [ ] **Mobile Strategy:** Decision between Capacitor App vs. Mobile Browser Extension.

## Current Working Logic
1. **Intercept:** Catch raw JSON from Niantic.
2. **Store:** Normalize into Zustand (`@iris/core`).
3. **Master Sync:** MapLibre (top layer) captures user input, sends `move` commands to the Google Maps instance (bottom layer).
4. **Trigger:** The Google Maps `idle` event indicates the map has stopped moving, which triggers a sync back to the IRIS overlay. Data is fetched automatically by the underlying map.
5. **Render:** Interceptor catches new data -> Store updates -> MapLibre redraws WebGL layers.

## Verification & Testing
- **Network:** Ensure no duplicate requests are triggered.
- **UI:** Verify stats counts match visible entities.
- **Accuracy:** Ensure MapLibre coordinates align perfectly with original Intel markers.
