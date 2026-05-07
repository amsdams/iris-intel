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

The mini-IRIS app has migrated from a monolithic `content.tsx` to a modular hook-driven design to ensure maintainability and readability:

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

### Current Implementation Progress (mini-IRIS)

| Feature | Status          | Comparison to IRIS |
| :--- |:----------------| :--- |
| **Spatial Indexing** | **DONE**        | Matches IRIS Core (`globalSpatialIndex`). |
| **3D Rendering** | **ADVANCED**    | Far superior to IRIS (Cylinders, Floating Beams, Stacking). |
| **Modular Refactor** | **DONE**        | Clean separation of map, data, and UI concerns. |
| **Mobile-First UI** | **DONE**        | Bottom Dock UX optimized for thumb-reach. |
| **Player Stats** | **DONE**        | L16 support, C.O.R.E. detection, AP progress bars, and explicit PLAYER stats requests. |
| **COMM Panel** | **DONE**        | Multi-tab (All/Faction/Alerts), colored nicks, map-snapping. |
| **Scores Panel** | **DONE**        | Global MU standings and Regional Top Agents. |
| **Inventory Stats** | **DONE**        | Summary view of weapons, resonators, and mods. |
| **Portal / Link Sizing** | **DONE**        | Zoom-aligned to IRIS-style interpolation for 2D readability. |
| **Player Trail Retention** | **DONE**        | 3 hour window, with fading trail segments and pulsing marker. |
| **Player Tracker Panel** | **IN PROGRESS** | COMM-derived player histories appear in the player panel and can jump the map to the latest hit. |
| **Portal History Overlays** | **DONE**        | Visited, captured, and scanned states can be toggled as highlight or inverse rings. |
| **Selection Details Panel** | **IN PROGRESS** | Portal, link, and field details now open from the dock, with a more readable portal layout and ownership view. |
| **Portal Media** | **IN PROGRESS** | Portal thumbnails and full image links are available in the selection details panel. |
| **Ingress Colour Alignment** | **DONE**        | Faction, portal history, key, C.O.R.E., tracker, item level, and rarity colors now route through shared constants. |
| **Inventory Key Map Overlay** | **VERIFYING**   | Toggleable key labels show total keys per portal plus loose/capsule split; mobile live-data testing is ongoing. |
| **Mock Map Test Data** | **IMPROVED**    | Mock history and inventory are deterministic, with separate local mock inventory for key overlay testing. |
| **Mock Map Panning Drift** | **FIXED**       | Mock pattern loading is separated from map data sync so panning and overlay changes do not regenerate mock coordinates. |
| **Key Overlay Performance** | **IMPROVED**    | Inventory key counts are pre-aggregated by portal and key labels only render at tactical zoom. |

### Roadmap & Alignment (TODO)

#### High Priority
1. **Hide Live Player Tracker in Mock Mode**: Prevent live player trails, labels, and player panel entries from appearing while using mock/source mode.
2. **Fix Player Profile Edge Cases**: Verify the explicit PLAYER stats request path on mobile/live Intel and add telemetry if some Intel sessions still do not expose `window.PLAYER`.
3. **Fix Player Tracker on Mobile**: Ensure player actions update the map reliably on mobile and that the player label plus pulse/animation remain visible.
4. **Player Tracker (Movement Traces)**: Continue improving COMM-derived agent coordinates, map-jump behavior, and trace rendering.
5. **Draw Tools**: Implement custom line/polygon drawing for field planning.
6. **Missions**: Integrate Top Missions and Mission Details (rendering waypoints in 3D).
7. **Search**: Portal and location search with map-jump interaction.

#### Recent Progress
- Portal history controls were added to the map tools drawer for visited, captured, and scanned states, with highlight and inverse display modes.
- Portal history state is now carried into MapLibre feature properties and rendered as dedicated ring layers.
- The selection details dock item opens compact portal, link, and field details inside the data panel container.
- Portal details now include thumbnails/full image access plus expandable ownership information for resonators and mods.
- Opening and closing the selection panel now nudges the map so the selected object remains usable around the mobile bottom panel.
- Player tracker data now builds COMM-derived player histories, renders fading trails, clusters labels, and exposes recent hits in the player dock.
- Request/interceptor handling was broadened around telemetry, freshness, retries, and player/request parsing.
- Ingress colour alignment now centralizes faction, history, tracker, key, C.O.R.E., item level, and rarity colors in `MapConstants`.
- The portal info panel received a quick readability pass: wider selection container, larger image, clearer owner/title hierarchy, and more legible resonator/mod ownership rows.
- Inventory keys can now be toggled on the map, with labels for visible portals showing total key count plus loose/capsule split.
- Mock portal history is now deterministic instead of random, so visited/captured/scanned overlay testing is stable across reloads.
- Mock inventory now includes deterministic loose and capsule-contained portal keys for map overlay testing without live data.
- Mock inventory is kept separate from live Zustand inventory, so switching between mock/source mode and live mode no longer overwrites live inventory.
- Key count labels were moved off the portal center and outlined with faction color to keep portal ownership readable.
- Mock tile-cache naming was clarified from `loadedKeys` to `loadedTileKeys` to avoid confusion with portal inventory keys.
- Mock/source pattern loading is now decoupled from map data sync, fixing panning drift caused by mock features being regenerated around the current map center.
- Key overlay rendering now uses pre-aggregated portal key counts for live and mock inventory instead of scanning inventory for every visible portal.
- Key labels now have a minimum zoom threshold to reduce map clutter and symbol layout work when zoomed out.
- The inventory panel now has a manual refresh button, matching the explicit refresh behavior already available for COMM.
- Manual inventory refresh now forces a network request past the normal freshness window while still respecting in-flight requests and failure cooldowns.
- Manual COMM refresh now uses the same force path, so explicit refresh bypasses plext freshness while scheduled polling keeps the normal cadence.
- Player profile loading now has an explicit `IRIS_PLAYER_STATS_REQUEST` path plus repeated page-world checks, so the panel does not depend on a single early passive `PLAYER` post.
- Initial live testing shows the player profile panel now loads more reliably; keep this in verification until mobile/live Intel sessions confirm it consistently.
- Inventory key labels are still being mobile-tested against live data, especially visibility, refresh behavior, and performance with real key counts.

#### Current Alignment Notes
- Portal and link scale now follow the same zoom-aware approach used by IRIS rather than hardcoded mini-IRIS sizes.
- The player trail lifetime matches the IRIS / IITC reference window at 3 hours, with the mini-IRIS using stronger visual fading to keep the trace readable.
- Selection details are usable after the first readability pass, but broader product/UI refinement can stay iterative.
- Player tracking is functional, but live tracker leakage into mock mode plus mobile map update behavior and label/animation visibility are still open issues.
- Inventory key support now includes a first map overlay, mock test data, pre-aggregated render counts, tactical zoom gating, and forced manual inventory refresh; mobile live-data verification is still in progress, while deeper filtering, capsule names, and drilldown can stay future work.
- Player profile data no longer depends only on the initial interceptor post; early testing looks better, but mobile/live verification should confirm whether any Intel sessions still lack a usable `window.PLAYER` payload.
- Mock/source mode is useful for overlay testing, with pattern coordinates now stable during panning and overlay syncs.
- Visual alignment is in a better baseline state after centralizing the Ingress palette; generic UI chrome can stay iterative.
- Remaining work is mostly feature breadth and mobile polish, not core rendering stability.

#### Feature Alignment
1. **Artifacts & Ornaments**: Support for specialized spatial markers (shards, beacons).
2. **Passcode Redemption**: Input UI for redeeming passcodes via `/r/redeemReward`.
3. **Geolocation**: Real-time user position tracking and "Center on Me" functionality.
4. **Dynamic Filters**: IITC-style health, level, and title filtering for portals.

#### Performance
1. **GeoJSON Splitting**: Move to per-type sources (`src-portals`, `src-links`, `src-fields`) to optimize re-parsing time.

---

## File Structure

```
src/
├── hooks/
│   ├── useComm.ts          # COMM logic + Polling
│   ├── useIntelMessages.ts # Interceptor message handler
│   ├── useMapRenderer.ts   # Map data synchronization
│   ├── usePlayerStats.ts   # Stats + CORE logic
│   ├── useScores.ts        # MU Score management
│   └── useComm.ts          # COMM Polling and Tab management
├── components/
│   ├── DataDock.tsx        # Bottom-dock panels (Player, COMM, Scores)
│   ├── MapTools.tsx        # Top-right drawers (Nav, Style, Mode)
│   ├── TacticalUI.tsx      # Main UI Orchestrator
│   └── LaunchButton.tsx    # Floating 3D toggle
├── MapConstants.ts         # Centralized colors and styles
└── GeoUtils.ts             # Geometry and formatting helpers
```
For very very later.

On the interceptor-library idea: yes, that is the right direction eventually. A separate interceptor/runtime library would make the split much cleaner:

- backend-like concerns: request state, freshness, retries, session handling, parsing
- frontend concerns: rendering, mode switching, selection, overlays

I would not do that now. It is a real extraction, and it pays off only once the mini-IRIS surface stabilizes enough that the boundary is clear. For later, though, it’s a good idea.
