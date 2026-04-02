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
  - **Done**: Three tabs, periodic refresh, interactive markup, and older/newer fetch triggers tied to scroll position.
  - **Missing**: "Send" functionality and Intel-style continuation/pagination semantics. The current implementation uses timestamp-based fetches instead of the original continuation-guid flow.

### 4. Filters & Visibility (Completed)
- **Original Intel**: Faction (E/R/M/N), Level (Range), Health (Range), and Layer (Links/Fields) toggles.
- **IRIS Status**: **Fully Implemented**.
  - **Faction**: Individual toggles for ENL, RES, MAC, NEUTRAL.
  - **Level**: Individual checkboxes (L1-L8).
  - **Health**: 4-bucket checkboxes (25%, 50%, 75%, 100%).
  - **Layers**: Toggles for Links and Fields.
  - **Optimization**: Filters are applied during the GeoJSON generation phase in `MapOverlay.tsx` to ensure high FPS.

### 5. Scores & Meta Panels (Completed)
- **Original Intel**: Uses `getGameScore` and `getRegionScoreDetails` to render the metascore panel and regional score details.
- **IRIS Status**: **Implemented**.
  - Global score is rendered in `GameScorePopup.tsx`.
  - Regional score and checkpoint history are rendered in `RegionScorePopup.tsx`.
  - Data is intercepted and parsed through dedicated score domain handlers.

### 6. Session & Subscription Management (Analysis)
- **Login Detection**: The original code detects session timeouts by monitoring for `401 Unauthorized` or `403 Forbidden` responses from the API. It also verifies the presence of the `csrftoken` cookie. If a failure occurs, it often triggers `window.location.reload()`.
- **C.O.R.E. Subscription**: The `getHasActiveSubscription()` function checks if the user is a C.O.R.E. member.
  - **Technical Impact**: Access to `getInventory` and detailed "Portal History" (V/C/S indicators) is strictly guarded by this check. Non-subscribers receive a "Access restricted" warning.
- **IRIS Status**: **Implemented Differently**.
  - Session-expiry state is now detected from `401` / `403` responses and login HTML returned from protected `/r/*` endpoints.
  - Recovery is surfaced in the IRIS status bar plus a prominent `Session Expired` alert, with a direct sign-in action on Intel instead of relying on an immediate full-page reload.
  - The sign-in action now uses the real Niantic/Intel sign-in flow rather than opening a transient Intel tab and hoping reload is enough.

### 7. Architecture & Extensibility (Implemented Differently)
- **Original Intel**: Mostly monolithic dashboard code centered around Google Maps, direct DOM updates, and tightly coupled view/state/network logic.
- **IRIS Implementation**: Uses a domain-oriented TypeScript structure with:
  - `packages/extension/src/content/domains/*` for intercepted endpoint parsing/handling
  - `packages/extension/src/content/runtime/*` for shared interception/runtime logic
  - `packages/extension/src/ui/domains/*` for domain-grouped UI
  - `packages/core` for normalized state and plugin management
- **Technical Impact**:
  - The architecture no longer mirrors Intel’s monolith one-to-one.
  - IRIS has a plugin API and live plugin feature rendering, which is an intentional extension beyond Intel core behavior.

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
- **Current IRIS Status**: **Partially Implemented**.
  - `Topbar.tsx` supports direct coordinate navigation.
  - Nominatim geocoding remains available as a fallback map search path.
  - Intel-native portal search is not currently enabled because the assumed `/r/getPortalSearch` path returned `404` and still needs verification.

### 2. Inventory Viewer (Completed)
Provides a view of the player's items, typically restricted to C.O.R.E. members in the official tool.
- **Requirements**:
  - List all items: Resonators, XMP Bursters, Ultra Strikes, Shields, Mods, Power Cubes, and Portal Keys.
  - **Subscription Check**: Must verify C.O.R.E. status via `window.PLAYER` or API response before attempting fetch.
- **IRIS Status**: **Fully Implemented**.
  - Trigger `/r/getInventory` via a button in the UI.
  - **Parsing**: Grouping by category and level/rarity with theme-consistent coloring.
  - **UI**: High-performance grid layout matching COMM's look and feel with C.O.R.E detection.

### 3. Robust Login Detection (Medium Priority)
- **Requirements**: Detect and notify the user when the Ingress session has expired.
- **Implementation Strategy**:
  - Update `interceptor.ts` to detect `401/403` status codes in XHR/Fetch responses.
  - Broadcast a `IRIS_LOGIN_REQUIRED` message to the UI.
  - Display a "Session Expired - Please Refresh/Login" toast in the `StatusBar`.
- **Current IRIS Status**: **Implemented**.
  - Session expiry and recovery states are tracked centrally.
  - Login HTML responses from protected endpoints are treated as expired-session signals, not generic JSON parse failures.
  - The status bar provides persistent recovery guidance, a top-level `Session Expired` alert appears on expiry, the alert directs the user to sign in on Intel, and repeated auth-noise is suppressed after expiry is detected.

### 4. Chat (Send Plext) (Medium Priority)
- **Requirements**:
  - Input field for the active tab (All/Faction).
  - Automatic tagging: Clicking a player name in COMM should prefix the input with `@nickname `.
- **Implementation Strategy**:
  - Add a `<form>` at the bottom of `CommPopup.tsx`.
  - Call the interceptor to trigger `/r/sendPlext` with the message text, current map center, and active tab.
  - Refresh the COMM feed immediately after a successful send.
- **Current IRIS Status**: **Implemented**.
  - COMM now supports sending on `ALL` and `FACTION`.
  - The request goes through the coordinator/runtime flow and now triggers an immediate newer-items refresh after success.
  - The UI exposes send-state and error feedback.

### 4.5 Missions (Implementation Notes)
- **Original Intel**:
  - Mission list and mission details are tightly connected.
  - Mission waypoint rows become clickable when the waypoint carries a portal/location object.
  - Clicking a waypoint pans the map to that waypoint, and portal-backed waypoints also drive the portal/location detail flow.
- **IRIS Status**: **Implemented, Closer To Intel**
  - Mission list/detail context and loading states have been refined.
  - Metadata now uses simpler inline `label: value` formatting rather than button-like pills.
  - Mission details waypoint rows now pan the IRIS map, and portal-type waypoints also request portal details.
  - This matches the practical Intel behavior more closely without reproducing the original dashboard DOM structure.

### 5. Portal History Indicators (Completed)
- **Requirements**:
  - Visual icons for "Visited" (hollow circle), "Captured" (filled circle), and "Scanned" (ornament) status.
- **IRIS Status**: **Fully Implemented**.
  - These flags are present in the `getEntities` and `getPortalDetails` responses as a bitmask at index 18.
  - **Map Rendering**: Multi-layer MapLibre circles for purple, red, and yellow rings.
  - **Filters**: Independent toggles in the Filters popup for tactical visualization.

### 6. Advanced Map Layers (Low Priority)
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
| **COMM Tabs** | All, Faction, Alerts | **Implemented** | Interactive markup, periodic refresh, and tab-specific fetches are in place. |
| **COMM History** | Infinite scroll via continuation GUID | **Partial** | IRIS has older/newer timestamp-driven fetches, but not the original continuation-guid behavior. |
| **Faction Filters** | ENL, RES, MAC, NEUTRAL | **Implemented** | High-performance client-side filtering. |
| **Level Filters** | Range Slider (Min - Max) | **Implemented** | Individual checkboxes for L1-L8 for more precision. |
| **Health Filters** | Range Slider (0 - 100%) | **Implemented** | Bucketed checkboxes (25%, 50%, 75%, 100%) for faster filtering. |
| **Login Detection** | Monitor 401/403 + CSRF cookie | **Implemented Differently** | IRIS detects `401` / `403` and login HTML responses, exposes session state in the status bar, shows a `Session Expired` alert with a sign-in action, and does not rely on Intel-style full-page reload. |
| **C.O.R.E. Perks** | `getHasActiveSubscription()` check | **Implemented** | Extraction from `window.PLAYER` and `/r/getHasActiveSubscription` integrated. |
| **Search** | Google Geocoding + Portal Search | **Partial** | IRIS supports coordinates and Nominatim fallback; Intel-native portal search still needs endpoint/flow verification before it can be reintroduced safely. |
| **Inventory** | C.O.R.E restricted item viewer | **Implemented** | Refined grid view with category filtering and level/rarity coloring. |
| **Global Score** | `getGameScore` metascore panel | **Implemented** | Rendered in `GameScorePopup` using intercepted score payloads. |
| **Regional Score** | `getRegionScoreDetails` details panel | **Implemented** | Region score, top agents, and checkpoint history are implemented. |
| **Chat Send** | Send message to All/Faction | **Implemented** | COMM supports sending via `/r/sendPlext` for `ALL` and `FACTION`, with runtime-owned request flow and UI feedback. |
| **Portal History** | Map markers for Visit/Capture | **Implemented** | Bitmask parsing from index 18 with multi-ring MapLibre rendering and toggles. |
| **Plugin System** | Not a first-class Intel concept | **Implemented Differently** | IRIS adds a plugin architecture and plugin-rendered map features beyond the original dashboard. |
| **Architecture** | Monolithic dashboard script | **Implemented Differently** | IRIS now uses domain-oriented content/runtime/UI modules rather than one large dashboard controller. |
| **Missions** | Start points, mission list, and waypoints | **Implemented** | Intercepts `/r/getMissionDetails`, `/r/getTopMissionsInBounds`, and `/r/getTopMissionsForPortal`; mission UI is now clearer and waypoint clicks pan/open details more like Intel. |
| **Artifacts** | Shards and target portals | **Implemented** | Added `getArtifactPortals` parsing and map rendering. |
| **Passcodes** | Passcode redemption field | **Missing** | Simple `/r/redeemReward` API hook. |

## Next Review Targets

### 1. Initial Login
- Verify original Intel behavior when opened while fully logged out.
- Distinguish first-load unauthenticated behavior from mid-session expiry.
- Decide whether IRIS should show dedicated initial-login guidance before protected requests begin failing.

### 2. UI Review
- Compare IRIS against original Intel first and IITC second for:
  - top-level menu order
  - popup placement
  - button placement and wording
  - consistency of actions and labels
- Capture small corrective changes rather than a redesign.
