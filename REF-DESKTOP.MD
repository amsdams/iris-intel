# Reference: Ingress Intel Desktop Implementation Analysis

This document serves as the technical blueprint for the IRIS extension, detailing the reverse-engineered logic from the original Ingress Intel dashboard (`gen_dashboard_*.js`) and mapping it to the IRIS architecture.

---

## Core Functionalities & Technical Implementations

### 1. Map Interface & Tile Management
- **Original Intel**: Built on **Google Maps API v3**. It uses a tile-based system to fetch map data.
- **IRIS Implementation**: Uses **MapLibre GL JS** for vector-like performance while maintaining raster tile support.
- **Technical Detail**: 
  - The `getEntities` API call takes a list of `tileKeys`. Tiles are based on a quadkey-like indexing system. 
  - The zoom level determines the "density" of portals returned (higher zoom = more portals, lower zoom = only high-level portals).
  - IRIS intercepts `getEntities` and updates a GeoJSON source in MapLibre for seamless rendering.

### 2. Portal Data Handling (Completed)
- **Original Intel**: Uses a two-stage approach.
    - **Summary**: `getEntities` provides basic info (lat/lng, team, level, health, resCount).
    - **Details**: `getPortalDetails` is triggered on click, returning a rich array containing owner, image, name, detailed resonators (owner, level, energy), and mods (owner, name, rarity, stats).
- **IRIS Status**: **Fully Implemented**. Intercepts both calls and updates the central `portals` store. UI displays details in `PortalInfoPopup.tsx`.

### 3. COMM (Communication) (Partial)
- **Original Intel**: Uses `getPlexts` for all chat and system logs.
- **Technical Detail**: Supports three tabs: `all`, `faction`, and `alerts`.
- **IRIS Status**: **In Progress**. 
  - **Done**: Parsing markup into interactive elements (click to move map).
  - **Missing**: "Send" functionality and proper pagination (infinite scroll).

### 4. Filters & Visibility (Completed)
- **Original Intel**: Faction (E/R/M/N), Level (Range), Health (Range), and Layer (Links/Fields) toggles.
- **IRIS Status**: **Fully Implemented**.
  - **Faction**: Individual toggles for ENL, RES, MAC, NEUTRAL.
  - **Level**: Individual checkboxes (L1-L8).
  - **Health**: 4-bucket checkboxes (25%, 50%, 75%, 100%).
  - **Layers**: Toggles for Links and Fields.
  - **Optimization**: Filters are applied during the GeoJSON generation phase in `MapOverlay.tsx` to ensure high FPS.

---

## Detailed Implementation Plan for Missing Features

### 1. Search Functionality (High Priority)
The search in original Intel is a versatile tool for navigation and portal discovery.
- **Requirements**:
  - **Coordinates**: Support `lat, lng` input (e.g., `35.6895, 139.6917`) to jump the map.
  - **Geocoding**: Use a service like **Nominatim (OpenStreetMap)** or MapLibre's search to resolve addresses to coordinates.
  - **Portal Search**: Trigger the `/r/getPortalSearch` API.
    - *Request*: `{ query: "Portal Name", v: "version_token", lat: map_lat, lng: map_lng }`.
    - *Response*: A list of portals with their names, addresses, and coordinates.
- **Implementation Strategy**:
  - Add a `SearchPopup` or search bar in `Topbar.tsx`.
  - Store results in a new `searchResults` slice in the store.
  - Clicking a result should call `updateMapState` and, if it's a portal, `selectPortal`.

### 2. Inventory Viewer (High Priority)
Provides a view of the player's items, typically restricted to C.O.R.E. members in the official tool.
- **Requirements**:
  - List all items: Resonators, XMP Bursters, Ultra Strikes, Shields, Mods, Power Cubes, and Portal Keys.
  - Show counts and levels for each item type.
- **Implementation Strategy**:
  - Trigger `/r/getInventory` via a button in the UI.
  - **Parsing**: The response is a complex nested structure. Iterate through `[guid, timestamp, item_data]` and group by `resourceWithLevels.type` or `modResource.resourceType`.
  - **UI**: A new `InventoryPopup.tsx` with categorized tabs. Use CSS grids for a compact "Ingress Prime" style layout.

### 3. Chat (Send Plext) (Medium Priority)
- **Requirements**:
  - Input field for the active tab (All/Faction).
  - Automatic tagging: Clicking a player name in COMM should prefix the input with `@nickname `.
- **Implementation Strategy**:
  - Add a `<form>` at the bottom of `CommPopup.tsx`.
  - Call the interceptor to trigger `/r/sendPlext` with the message text, current map center, and active tab.
  - Refresh the COMM feed immediately after a successful send.

### 4. Portal History Indicators (Medium Priority)
- **Requirements**:
  - Visual icons for "Visited" (hollow circle), "Captured" (filled circle), and "Scanned" (ornament) status.
- **Implementation Strategy**:
  - These flags are present in the `getEntities` response (indices 18, 19, 20 in some versions, or named properties).
  - Update `MapOverlay.tsx` to include these flags in the GeoJSON `properties`.
  - Use MapLibre `circle-stroke-width` or additional symbol layers to render the status icons.

### 5. Advanced Map Layers (Low Priority)
- **Missions**: `/r/getMissionDetails` and `/r/getHashtagMissions`.
- **Artifacts**: `/r/getArtifactPortals`. These require dedicated GeoJSON sources and layers to show shards and their movement targets.
- **Regional Cells**: Render the S2 cell boundaries used for scoring (Level 6 cells).

---

## Comparison Summary

| Feature | Original Intel Implementation | IRIS Status | Implementation Notes |
| :--- | :--- | :--- | :--- |
| **Map Engine** | Google Maps API v3 | **MapLibre GL JS** | Significant performance gain with vector-like GeoJSON rendering. |
| **Data Fetching** | Tile-based `getEntities` | **Intercepted** | IRIS hooks the same API calls to maintain a local Zustand store. |
| **Portal Details** | Rich detailed response on click | **Implemented** | Displays owner, mods, and resonators in `PortalInfoPopup`. |
| **COMM Tabs** | All, Faction, Alerts | **Implemented** | Interactive markup allows jumping to portals from chat. |
| **COMM History** | Infinite scroll via continuation GUID | **Partial** | Currently shows last 200; pagination logic is pending. |
| **Faction Filters** | ENL, RES, MAC, NEUTRAL | **Implemented** | High-performance client-side filtering. |
| **Level Filters** | Range Slider (Min - Max) | **Implemented** | Individual checkboxes for L1-L8 for more precision. |
| **Health Filters** | Range Slider (0 - 100%) | **Implemented** | Bucketed checkboxes (25%, 50%, 75%, 100%) for faster filtering. |
| **Layer Filters** | Links and Fields toggles | **Implemented** | Synchronized with GeoJSON layer visibility. |
| **Scoring** | Global (MU) and Regional details | **Implemented** | Global in Topbar; Regional in dedicated popup. |
| **Player Stats** | Static PLAYER object | **Implemented** | Dynamic updates via MutationObserver in `interceptor.ts`. |
| **Search** | Google Geocoding + Portal Search | **Missing** | Requires OSM Geocoding + `/r/getPortalSearch` integration. |
| **Inventory** | C.O.R.E restricted item viewer | **Missing** | Needs `/r/getInventory` parsing + UI grid. |
| **Chat Send** | Send message to All/Faction | **Missing** | Requires Input form + `/r/sendPlext` API call. |
| **Portal History** | Map markers for Visit/Capture | **Missing** | Needs parsing from `getEntities` + MapLibre layer styling. |
| **Missions** | Start points and waypoints | **Missing** | Requires `/r/getMissionDetails` integration. |
| **Artifacts** | Shards and target portals | **Missing** | Needs Artifact API parsing + path rendering. |
| **Passcodes** | Passcode redemption field | **Missing** | Simple `/r/redeemReward` API hook. |
