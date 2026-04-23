# MapLibre + RBush + Zustand Architecture
## Spatial Entity Rendering for Ingress-style Maps

---

## Overview

This document describes the architecture for rendering large numbers of spatial entities
(portals, links, fields, artifacts, ornaments) on a MapLibre GL map with good performance.

**Core principle:** Three layers with distinct responsibilities that never overlap.

| Layer | Tool | Owns |
|---|---|---|
| Spatial indexing | RBush | Geometry lookups, viewport queries |
| Application state | Zustand | UI state, filtered results, selections |
| Rendering | MapLibre GL | Drawing, camera, tile layers |

---

## Modular Hook-based Architecture (v1.2+)

The POC has migrated from a monolithic `content.tsx` to a modular hook-driven design to ensure maintainability and readability:

- **`useMapRenderer`**: Centralized logic for converting RBush results and Store entities into GeoJSON features for MapLibre. Handles 3D altitudes and geometry approximation (e.g., portal cylinders).
- **`useIntelMessages`**: High-performance listener for the `interceptor.js` stream. Routes incoming data to the correct Zustand store actions and ensures the spatial index is synchronized.
- **`usePlayerStats`**: Manages C.O.R.E. subscription verification and player statistic polling.
- **`useComm`**: Orchestrates COMM polling and tab management (ALL / FACTION / ALERTS).
- **`useScores`**: Periodic global and regional MU standings updates.
- **`usePatterns`**: Simulation engine for stress testing and visual alignment.

---

## Entity Types

| Entity | Geometry | GeoJSON type | Notes |
|---|---|---|---|
| Portals | Point | `Point` | Base entity, ~200/km² worst-case |
| Links | Line | `LineString` | ~100–300/km², cross tile boundaries |
| Fields | Triangle | `Polygon` | ~20–60/km², can be nested/layered |
| Artifacts | Point | `Point` | Indexed same as portals |
| Ornaments | Point | `Point` | Indexed same as portals |

---

## Spatial Index (RBush)

RBush is a high-performance R-tree for 2D bounding-box queries. It lives **outside React and Zustand** as module-level singletons or via the `@iris/core` `globalSpatialIndex`.

### Why not in Zustand?

- RBush trees are large mutable objects. Zustand does shallow equality checks on state — putting a tree in state breaks reactivity and causes spurious re-renders.
- The tree never needs to trigger a re-render by itself. Only its *query results* do.
- Keeping it as a singleton means it can be updated (e.g. on data load) without touching React at all.

### Loading data

```ts
// LineStrings — use bounding box of endpoints
linkIndex.load(links.map(l => ({
  minX: Math.min(l.fromLon, l.toLon),
  minY: Math.min(l.fromLat, l.toLat),
  maxX: Math.max(l.fromLon, l.toLon),
  maxY: Math.max(l.fromLat, l.toLat),
  id: l.id, type: 'link'
})));

// Polygons — bounding box of all vertices
fieldIndex.load(fields.map(f => ({
  minX: Math.min(...f.points.map(p => p.lng)),
  minY: Math.min(...f.points.map(p => p.lat)),
  maxX: Math.max(...f.points.map(p => p.lng)),
  maxY: Math.max(...f.points.map(p => p.lat)),
  id: f.id, type: 'field'
})));
```

---

## Application State (Zustand)

Zustand stores only what React needs to render: the *results* of spatial queries and UI state.
It never stores the raw geometry data or the RBush trees themselves.

### Viewport → RBush → Zustand → MapLibre sources

```
map 'move' / 'moveend' event
  → extract bbox from map.getBounds()
  → syncToMap() triggered                  ← RBush query happens here
  → Generate GeoJSON FeatureCollection
  → MapLibre source.setData(features)
```

---

## Performance Guidelines

### Throttle viewport handlers
MapLibre fires `move` every animation frame (~60fps). Always throttle RBush queries or use `moveend` for heavy operations.

### Use `setData` not layer filters for visibility
Calling `map.setFilter(layerId, ...)` is fast for small datasets but degrades at 10k+ features. Prefer updating the source data directly with only the visible subset.

### Bulk load RBush with `.load()`
RBush's `.load()` is **~10× faster** than inserting items one by one. Always use `.load()` for initial data or large batches.

---

## 3D Tactical Overlay (Extrusion)

When Extrusion Mode is active, entities take on a physical volume. This requires **Dual-Geometry Mapping**:

1. **Portals (Energy Hubs)**:
   - Geometry: 12-sided approximated cylinders.
   - Dynamic Height: `Base (200m) + (Max Nested Layer * 20m) + Cap (15m)`.
2. **Links (Floating Beams)**:
   - Geometry: Double-layered prismatic extrusions (wide base, narrow top).
   - Altitude: Calculated to match the altitude of the field panes.
3. **Fields (Glass Panes)**:
   - Altitude: `Base (200m) + (Nesting Layer * 20m)`.
   - Result: Overlapping fields appear as stacked translucent glass panes.

---

## Status & Roadmap

### Current Implementation Progress (POC)

| Feature | Status | Comparison to IRIS |
| :--- | :--- | :--- |
| **Spatial Indexing** | **DONE** | Matches IRIS Core (`globalSpatialIndex`). |
| **3D Rendering** | **ADVANCED** | Far superior to IRIS (Cylinders, Floating Beams, Stacking). |
| **Modular Refactor** | **DONE** | Clean separation of map, data, and UI concerns. |
| **Mobile-First UI** | **DONE** | Bottom Dock UX optimized for thumb-reach. |
| **Player Stats** | **DONE** | L16 support, C.O.R.E. detection, AP Progress bars. |
| **COMM Panel** | **DONE** | Multi-tab (All/Faction/Alerts), colored nicks, map-snapping. |
| **Scores Panel** | **DONE** | Global MU standings and Regional Top Agents. |
| **Inventory Stats** | **DONE** | Summary view of weapons, resonators, and mods. |

### Next Session Priorities

1.  **Mission Integration**:
    *   **Goal**: Add a 5th tab to the Data Dock for "Missions".
    *   **Visual**: Render mission start-points and waypoint sequences in 3D.
2.  **Player Tracker (Movement Traces)**:
    *   **Goal**: Restore real-time agent movement parsing from COMM.
    *   **Visual**: 3D "Agent Avatars" with color-coded movement traces.
3.  **Inventory: Keys on Map**:
    *   **Goal**: Integrate the `@iris/core` Inventory parser to show keys on portals.

---

## File Structure

```
src/
├── hooks/
│   ├── useComm.ts          # COMM logic + Polling
│   ├── useIntelMessages.ts # Interceptor message handler
│   ├── useMapRenderer.ts   # Map data synchronization
│   ├── usePlayerStats.ts   # Stats + CORE logic
│   └── useScores.ts        # MU Score management
├── components/
│   ├── DataDock.tsx        # Bottom-dock panels (Player, COMM, Scores)
│   ├── MapTools.tsx        # Top-right drawers (Nav, Style, Mode)
│   ├── TacticalUI.tsx      # Main UI Orchestrator
│   └── LaunchButton.tsx    # Floating 3D toggle
├── MapConstants.ts         # Centralized colors and styles
└── GeoUtils.ts             # Geometry and formatting helpers
```
