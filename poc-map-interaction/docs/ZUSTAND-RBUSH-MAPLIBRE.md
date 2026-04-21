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

RBush is a high-performance R-tree for 2D bounding-box queries. It lives **outside React and Zustand** as module-level singletons — it is a data structure, not state.

### Why not in Zustand?

- RBush trees are large mutable objects. Zustand does shallow equality checks on state — putting a tree in state breaks reactivity and causes spurious re-renders.
- The tree never needs to trigger a re-render by itself. Only its *query results* do.
- Keeping it as a singleton means it can be updated (e.g. on data load) without touching React at all.

### Setup — `src/spatial/index.ts`

```ts
import RBush from 'rbush';

export interface SpatialItem {
  minX: number; minY: number;
  maxX: number; maxY: number;
  id: string;
  type: 'portal' | 'link' | 'field' | 'artifact' | 'ornament';
}

export const portalIndex   = new RBush<SpatialItem>();
export const linkIndex     = new RBush<SpatialItem>();
export const fieldIndex    = new RBush<SpatialItem>();
export const artifactIndex = new RBush<SpatialItem>();
export const ornamentIndex = new RBush<SpatialItem>();
```

### Loading data

```ts
import { portalIndex, linkIndex, fieldIndex } from './spatial';

// Points — minX/maxX/minY/maxY are all equal
portalIndex.load(portals.map(p => ({
  minX: p.lon, minY: p.lat,
  maxX: p.lon, maxY: p.lat,
  id: p.id, type: 'portal'
})));

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
  minX: Math.min(...f.coords.map(c => c[0])),
  minY: Math.min(...f.coords.map(c => c[1])),
  maxX: Math.max(...f.coords.map(c => c[0])),
  maxY: Math.max(...f.coords.map(c => c[1])),
  id: f.id, type: 'field'
})));
```

> **Note on links:** A diagonal link's bounding box is larger than the link itself, producing
> false positives. This is intentional and fine — RBush does fast bbox rejection, and MapLibre
> renders the actual line geometry. Do not do exact segment intersection in the query hot path.

---

## Application State (Zustand)

Zustand stores only what React needs to render: the *results* of spatial queries and UI state.
It never stores the raw geometry data or the RBush trees themselves.

### Store — `src/store/mapStore.ts`

```ts
import { create } from 'zustand';
import { portalIndex, linkIndex, fieldIndex, artifactIndex, ornamentIndex } from '../spatial';

interface BBox { minX: number; minY: number; maxX: number; maxY: number; }

interface MapStore {
  // Visible entity IDs from last viewport query
  visiblePortalIds:   string[];
  visibleLinkIds:     string[];
  visibleFieldIds:    string[];
  visibleArtifactIds: string[];
  visibleOrnamentIds: string[];

  // UI state
  selectedPortalId: string | null;
  factionFilter:    'all' | 'Resistance' | 'Enlightened' | 'Neutral';
  minLevel:         number;

  // Actions
  updateViewport:      (bbox: BBox) => void;
  setSelectedPortal:   (id: string | null) => void;
  setFactionFilter:    (f: MapStore['factionFilter']) => void;
  setMinLevel:         (l: number) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  visiblePortalIds:   [],
  visibleLinkIds:     [],
  visibleFieldIds:    [],
  visibleArtifactIds: [],
  visibleOrnamentIds: [],
  selectedPortalId:   null,
  factionFilter:      'all',
  minLevel:           1,

  updateViewport: (bbox) => set({
    visiblePortalIds:   portalIndex.search(bbox).map(i => i.id),
    visibleLinkIds:     linkIndex.search(bbox).map(i => i.id),
    visibleFieldIds:    fieldIndex.search(bbox).map(i => i.id),
    visibleArtifactIds: artifactIndex.search(bbox).map(i => i.id),
    visibleOrnamentIds: ornamentIndex.search(bbox).map(i => i.id),
  }),

  setSelectedPortal: (id) => set({ selectedPortalId: id }),
  setFactionFilter:  (f)  => set({ factionFilter: f }),
  setMinLevel:       (l)  => set({ minLevel: l }),
}));
```

---

## MapLibre Integration

### Viewport → RBush → Zustand → MapLibre sources

```
map 'move' / 'moveend' event
  → extract bbox from map.getBounds()
  → call store.updateViewport(bbox)        ← RBush query happens here
  → Zustand updates visible IDs
  → React re-renders GeoJSON sources
  → MapLibre re-draws layers
```

### Map component — `src/components/Map.tsx`

```tsx
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import throttle from 'lodash.throttle';
import { useMapStore } from '../store/mapStore';
import { allPortals, allLinks, allFields } from '../data'; // your full dataset

export function Map() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const updateViewport = useMapStore(s => s.updateViewport);
  const visiblePortalIds = useMapStore(s => s.visiblePortalIds);
  const factionFilter = useMapStore(s => s.factionFilter);

  // Init map
  useEffect(() => {
    const map = new maplibregl.Map({ container: 'map', /* ... */ });
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('portals', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource('links',   { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource('fields',  { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

      map.addLayer({ id: 'fields-fill',  type: 'fill',   source: 'fields',  /* paint */ });
      map.addLayer({ id: 'links-line',   type: 'line',   source: 'links',   /* paint */ });
      map.addLayer({ id: 'portals-circle', type: 'circle', source: 'portals', /* paint */ });
    });

    // Throttle viewport updates — MapLibre fires 'move' every animation frame
    const onMove = throttle(() => {
      const b = map.getBounds();
      updateViewport({
        minX: b.getWest(), minY: b.getSouth(),
        maxX: b.getEast(), maxY: b.getNorth(),
      });
    }, 120); // ms

    map.on('move', onMove);
    map.on('moveend', onMove);
    return () => { map.remove(); };
  }, []);

  // Update GeoJSON sources when visible IDs change
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    const idSet = new Set(visiblePortalIds);
    const features = allPortals
      .filter(p => idSet.has(p.id))
      .filter(p => factionFilter === 'all' || p.faction === factionFilter);

    (map.getSource('portals') as maplibregl.GeoJSONSource)
      .setData({ type: 'FeatureCollection', features });
  }, [visiblePortalIds, factionFilter]);

  return <div id="map" style={{ width: '100%', height: '100vh' }} />;
}
```

---

## Performance Guidelines

### Throttle viewport handlers
MapLibre fires `move` every animation frame (~60fps). Always throttle RBush queries to **100–150ms**.

```ts
const onMove = throttle(handleMove, 120);
map.on('move', onMove);
map.on('moveend', onMove); // catches final position after inertia
```

### Separate sources per entity type
Use one GeoJSON source per entity type (portals, links, fields, artifacts, ornaments).
Mixing them into one source forces MapLibre to re-parse the entire FeatureCollection on any update.

### Use `setData` not layer filters for visibility
Calling `map.setFilter(layerId, ...)` is fast for small datasets but degrades at 10k+ features
because MapLibre still processes all features in the source. Prefer updating the source data
directly with only the visible subset.

### Bulk load RBush with `.load()`
RBush's `.load()` uses OMT bulk-loading algorithm and is **~10× faster** than inserting items one by one with `.insert()`. Always use `.load()` for initial data.

### Keep data lookup maps
Maintain a `Map<string, Portal>` (id → object) alongside the RBush index for O(1) lookup
after a spatial query returns IDs.

```ts
export const portalMap = new Map<string, Portal>(
  allPortals.map(p => [p.id, p])
);
```

### Zoom-level culling
Skip RBush queries entirely at low zoom levels — render summary layers (e.g. cluster counts)
instead of individual portals. A practical threshold:

| Zoom | Render |
|---|---|
| < 12 | Heatmap or cluster layer only |
| 12–14 | Fields + links only |
| 14–16 | All entities, no label text |
| > 16 | All entities + labels |

---

## 3D Tactical Overlay (Extrusion)

When Extrusion Mode is active, entities take on a physical volume. This requires **Dual-Geometry Mapping**:

1. **Portals (Energy Hubs)**:
   - Geometry: 12-sided approximated cylinders.
   - Dynamic Height: `Base (200m) + (Max Nested Layer * 20m) + Cap (15m)`.
2. **Links (Floating Beams)**:
   - Geometry: Double-layered prismatic extrusions (wide base, narrow top).
   - Altitude: Calculated to match the altitude of the highest anchored field pane.
3. **Fields (Glass Panes)**:
   - Altitude: `Base (200m) + (Nesting Layer * 20m)`.
   - Result: Overlapping fields appear as stacked translucent glass panes.

### Automatic Layering (Nesting)

Do not store layer numbers in the database. Calculate them dynamically during the data-sync phase:
1. Identify the center-point of the field.
2. Count how many other fields contain that point via `isPointInField` (Point-in-Triangle).
3. The count equals the field's `layer` (altitude index).

---

## Link-Driven Data Flow

Matching Ingress logic, the system should be **Link-Centric**:

1. **Link Insertion**: When a link is added, search for common neighbors between the two endpoints.
2. **Implicit Field Creation**: If a common neighbor exists, a triangle is closed. Automatically generate the `Field` entity.
3. **Reactivity**: Since fields are implicit, the UI must run the "Automatic Layering" calculation whenever the link-set changes to ensure 3D altitudes remain consistent.

## Status & Roadmap

### Current Implementation Progress (POC)

| Feature | Status | Comparison to IRIS |
| :--- | :--- | :--- |
| **Spatial Indexing** | **DONE** | Matches IRIS Core (`globalSpatialIndex`). |
| **3D Rendering** | **ADVANCED** | Far superior to IRIS (Cylinders, Floating Beams, Stacking). |
| **Live Interception**| **ACTIVE** | Full active request support for portal details. |
| **Rich Dashboard** | **DONE** | Supports R1-8, VRS/VRHS abbreviations, and Mitigation. |
| **Interaction** | **STABLE** | Pixel-perfect snapping (Portals > Fields > Links). |
| **Tooling** | **ALIGNED** | Standardized TSConfig/ESLint with root monorepo. |
| **UI Framework** | **RAW DOM** | IRIS uses Preact; POC needs migration for porting. |

### Alignment with IRIS & IITC-CE Core

To move from a POC to a core IRIS feature, the following alignment steps are required:

1.  **Data Coordinator**:
    *   Adopt the main extension's `request-coordinator.ts` logic.
    *   Implement batching, intelligent polling (idle vs. active), and retry-with-backoff for entities.
2.  **Standardized Data Handling**:
    *   Expand beyond entities to handle **Inventory**, **Player Stats**, and **Scores**.
    *   Align "Live Mode" state management with the main IRIS store slices.
3.  **Preact Component Architecture**:
    *   Refactor the dashboard and map controls into Preact components.
    *   Enable the 3D Map to be used as a drop-in replacement for the current `MapOverlay.tsx`.
4.  **IITC-CE Compatibility**:
    *   Ensure plugin-sdk compatibility so standard IITC scripts can "target" the 3D view.

### Critical TODOs (Next Session)

1.  **Player Tracker**:
    *   **Goal**: Intercept `/r/getPlexts` and parse agent locations.
    *   **Visual**: Render real-time 3D "Agent Avatars" with movement traces.
2.  **Preact Migration Phase 1**:
    *   **Goal**: Convert the `showDetails` dashboard from HTML strings to a Preact component.
3.  **Performance Optimization**:
    *   **Goal**: Split the `entities` GeoJSON source into `src-portals`, `src-links`, and `src-fields` to minimize re-parse overhead in high-density areas.
4.  **Browser support**:
    *   **Goal**: Fix Mobile Firefox visibility issues (3D button missing on small viewports).

---

## Data Flow Diagram

```
Raw data (GeoJSON / API)
        │
        ▼
  RBush indexes ──────────────────────────────┐
  (module singletons)                         │
        │                                     │
  map 'move' event                            │
        │                                     │
        ▼                                     │
  updateViewport(bbox) ──► RBush.search()     │
        │                                     │
        ▼                                     │
  Zustand store                               │
  visiblePortalIds[]                          │
  visibleLinkIds[]                            │
  visibleFieldIds[]                           │
        │                                     │
        ▼                                     │
  React component                             │
  filter full dataset by visible IDs ◄────────┘
        │
        ▼
  MapLibre source.setData(filteredFeatures)
        │
        ▼
  MapLibre renders layers
```

---

## File Structure

```
src/
├── spatial/
│   └── index.ts          # RBush instances + load helpers
├── store/
│   └── mapStore.ts       # Zustand store
├── data/
│   ├── portals.ts        # Full portal dataset + portalMap (id → Portal)
│   ├── links.ts          # Full link dataset
│   └── fields.ts         # Full field dataset
├── components/
│   ├── Map.tsx           # MapLibre init + source updates
│   ├── PortalPanel.tsx   # Reads selectedPortalId from Zustand
│   └── FilterBar.tsx     # Writes factionFilter / minLevel to Zustand
└── hooks/
    └── useViewportEntities.ts  # Optional: wraps the Zustand selectors
```

---

## Dependencies

```json
{
  "maplibre-gl": "^4.x",
  "rbush": "^3.x",
  "zustand": "^4.x",
  "lodash.throttle": "^4.x"
}
```

```bash
npm install maplibre-gl rbush zustand lodash.throttle
npm install -D @types/lodash.throttle
```
