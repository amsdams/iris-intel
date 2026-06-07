# Detailed Comparison Findings: IRIS vs. IITC-Button vs. IITC-CE

> Historical note, May 2026: this April 2026 comparison is retained as
> reference material. It predates the page-world MapLibre runtime, owned entity
> refresh follow-ups, expanded Bench variants, Draw Tools baseline, and player
> tracker pin work. Use `docs/iris/architecture.md`,
> `docs/iris/page-world-map-runtime.md`, and `docs/iris/work-items.md` for current
> architecture and priorities.

This document provides a historical comparison of the **IRIS** extension, the **IITC-Button** reference, and the **IITC-CE** (Community Edition) core.

## 1. Architectural Comparison

| Feature | IRIS | IITC-Button | IITC-CE (Core) |
|---------|------|-------------|----------------|
| **Core Tech** | TypeScript, Preact, Zustand | JavaScript, Vue | JavaScript, jQuery, Leaflet |
| **Execution Context** | Extension Background/Content | Extension + Injected Bridge | In-page (as Userscript) |
| **Map Engine** | MapLibre (Vector-based) | Leaflet (via IITC) | Leaflet (Raster/SVG markers) |
| **Data Strategy** | Passive Sniffing + Active Fetch | Bridge Proxy for Userscripts | Direct NIA API Requests |
| **State Management** | Centralized Zustand Store | Decentralized (Vue/Local Storage) | Global window objects |
| **Plugin Model** | Custom SDK (React-friendly) | Host for legacy Userscripts | Native Userscript/Hook system |

## 2. Deep Dive: HTTP & Data Handling

### IRIS (Modern, Surgical)
- **HTTP:** Uses `safeIrisFetch` (Fetch API) with surgical request batching (25 tiles per request). It integrates with the page's own network lifecycle but can "take over" to ensure freshness.
- **Data:** Parses raw NIA JSON into a normalized TypeScript store. Implements a "richer-wins" merge strategy to ensure detailed portal data (from clicks) isn't wiped by summary data (from pans).
- **Store:** Uses Zustand for high-performance, reactive state. Data is indexed by GUID (portals, links, fields).

### IITC-Button (The Bridge)
- **HTTP:** Does not make its own Intel requests. Instead, it provides a "Bridge" (`xhr-bridge.js`) that uses an iframe sandbox to allow injected IITC scripts to bypass CORS and NIA's strict checking.
- **Data:** Passes raw response data directly to the injected IITC core.
- **Store:** Does not maintain an entity store in the extension. It relies on the injected IITC core's memory.

### IITC-CE (The Standard)
- **HTTP:** Manages a complex request queue (`MapDataRequest`). Features:
    - **Max Parallel Requests:** Limits to 5 concurrent requests to avoid blocking other traffic.
    - **Tile Batching:** 25 tiles per request.
    - **Backoff/Retry:** Sophisticated retry logic for timeouts and server errors.
    - **Refresh Timers:** Adaptive timers (3s for move, 5m/15m for idle) that IRIS has largely adopted.
- **Data:** Decodes raw arrays into objects using `entity_decode.js`. This is the "Gold Standard" for Ingress data parsing.
- **Store:** Uses global objects (`window.portals`, `window.links`, etc.) that are often tied directly to Leaflet layer objects.

## 3. How to Make IRIS Behave More Like IITC

To align IRIS closer to the "IITC Experience" while keeping its modern architecture, we should focus on:

### HTTP & Request Logic
- **Strict Parallelism:** Implement a strict limit on concurrent Intel requests (e.g., 5) in `RequestCoordinator` to match IITC's `MAX_REQUESTS`.
- **Enhanced Retry Logic:** Adopt IITC's specific retry counters for different error types (Timeout vs. Server Error).
- **Tile Cache:** Move from simple `tileFreshness` to a more robust `DataCache` that can persist across minor sessions or handle "stale-while-revalidate" patterns.

### Data & Store
- **Full Entity Decoding:** Expand `parser.ts` to support 100% of the attributes found in `entity_decode.js` (e.g., more detailed mod stats, history flags, and artifact types).
- **Normalized Relationships:** While IRIS has surgical updates, adding secondary indexes (e.g., "links connected to this portal") would allow for IITC-like "Portal Info" calculations without full store scans.

### Rendering & Plugins
- **Highlighter Contract:** IITC uses a single-selected "Highlighter". IRIS currently allows concurrent plugins. Implementing a "Primary Highlighter" slot in the store would allow for classic IITC behaviors (e.g., "Highlight weak portals").
- **Layer Control:** Implement a formal "Layer" system in IRIS that plugins can register to, similar to Leaflet's `L.Control.Layers`.

## 4. Next Prioritized Work for IRIS

Based on these findings, the next steps in `docs/iris/work-items.md` should be:

1.  **[Live Map Freshness]** Implement a strict concurrent request limit (5) in `RequestCoordinator`.
2.  **[Plugin Overlay]** Implement a "Single Highlighter" selection model to allow for classic IITC portal highlighting.
3.  **[Intel Parity]** Enhance `parser.ts` to capture more detailed mod stats and portal history flags.
4.  **[Draw Tools]** Use the findings from `quick-draw-links` (in IITC-CE plugins) to implement the first mobile-safe link planning baseline.
