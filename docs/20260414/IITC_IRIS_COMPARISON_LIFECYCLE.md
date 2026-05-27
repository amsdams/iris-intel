# IITC-CE vs IRIS: Request Lifecycle and Map Sync

This note compares the "request lifecycle and map sync" part of IITC-CE with the current IRIS runtime. The goal is not
to decide that IITC is always better. It is to make the semantic boundary explicit: what IITC already solved over years,
what IRIS has reimplemented in a modern MapLibre/extension runtime, and where we should investigate performance or
correctness regressions.

## High-Level Difference

**IITC-CE** is built as a monolithic, single-world state machine deeply coupled with Leaflet. Its core request logic (`MapDataRequest`) manages everything from tile math and network queuing to incremental DOM/SVG mutation. It relies on a global, mutable state and a synchronous render loop that can be throttled but remains on the main thread.

**IRIS** adopts a modern, distributed architecture:
1.  **Distributed State:** Logic resides in the Extension/Content world (Request Coordinator, Zustand Store), while rendering is isolated in the Page world (MapLibre Runtime).
2.  **Message-Driven:** Communication between these worlds happens via asynchronous JSON messages over `window.postMessage`.
3.  **Declarative Rendering:** Instead of mutating individual Leaflet objects, IRIS publishes GeoJSON FeatureCollections to MapLibre. This allows the GPU to handle most of the rendering work but introduces a new "sync" overhead for large data sets.
4.  **Proactive Diagnostics:** IRIS features built-in telemetry for endpoint health, source timings, and frame budget, allowing for empirical performance tuning.

## Concept Comparison

| Concept | Status | IITC-CE | IRIS | Gap / Next Action |
| :--- | :--- | :--- | :--- | :--- |
| **Runtime Ownership** | Different by design | Unified page-world runtime. | Split world (Extension Logic + Page Rendering). | Requires robust serialization and message protocol. |
| **Tile Math** | Aligned | Uses Intel's tile params and slippy map tilenames. | Re-implemented in Core. Identical data zoom and tile logic. | Keep auditing for edge cases like the antimeridian. |
| **Request Priority** | Aligned | Sorts queued tiles by distance from map center. | `buildEntityRequestPayload` sorts by distance squared from center. | Ensure batching (25 tiles) respects this priority. |
| **Surgical Fetching** | Aligned | Skips "fresh" tiles via `DataCache`. | Skips "fresh" tiles via store-level `tileFreshness`. | TTLs are currently hardcoded (2m in IRIS vs 3-5m in IITC). |
| **Move-Settle Delay** | Aligned | 3-second delay after map movement stops. | `ENTITY_MOVE_SETTLE_MS = 3000`. | Critical for preventing network bursts during rapid panning. |
| **Fetch Containment** | Aligned | Skips fetch if viewport is inside recently fetched bounds. | `isCoveredByPreviousDataBounds` checks containment at same zoom. | Ported successfully to minimize redundant requests. |
| **Retry Semantics** | Partial | Per-tile error tracking and retries (up to 5). | Endpoint/Generation level retry (up to 3). | Tile-granular retry would improve resilience against partial failures. |
| **Request Cancellation** | Aligned | Ignores response if tile is no longer in `queuedTiles`. | Uses **Generation IDs** to drop responses from stale map views. | IRIS mechanism is cleaner for an async message-based system. |
| **Render Throttling** | Different by design | Incremental chunks (`RENDER_BATCH_SIZE`) to stay under frame budget. | Coalesced/Deferred `setData` calls to protect map movement. | Investigate incremental GeoJSON updates for very dense views. |
| **COMM/Map Sync** | IRIS Ahead | COMM is largely independent of map topology. | COMM plexts provide coordinates to "hint" at needed portal/link refreshes. | Keep hints deferred during pans to prevent frame drops. |
| **Cleanup/Culling** | Gap | Immediate removal of GUIDs not present in the current pass. | Store-wide `cullEntities` runs every 5 mins by distance/time. | A "refresh pass" concept could allow for faster stale-data cleanup. |
| **Diagnostics** | IRIS Ahead | Minimal status bar updates and debug tiles. | Rich telemetry for network, parse times, and source timings. | Use this data to validate every architectural change. |

## In-Depth Code Review Findings

### 1. Request Orchestration (`RequestCoordinator.ts`)
IRIS uses a robust state machine for scheduling. Key strengths include:
*   **Startup Grace:** Prevents redundant fetches during initial rehydration.
*   **Move Coalescing:** Correctly cancels and restarts the 3s settle timer on rapid movement.
*   **Generation Tracking:** Every move increments `entityRefreshGeneration`, which is used to drop stale network responses before they hit the parser.

### 2. Data Parsing (`EntityParser.ts`)
The parser is a faithful re-implementation of the Intel protocol:
*   **Placeholder Portals:** Correctly extracts coordinates from Links and Fields to create "summary" portals.
*   **History Bits:** Support for Niantic's 2021 history bitmask (visited/captured/scout-controlled) is fully implemented.

### 3. Map Synchronization (`page-map-runtime.ts`)
Synchronization is the most performance-sensitive part of IRIS:
*   **Deferral Logic:** `DEFERRED_SOURCE_SYNC_SETTLE_MS (120ms)` effectively batches multiple GeoJSON updates into a single MapLibre paint.
*   **Low-Zoom Suspension:** Hiding link/field layers below Zoom 10 during movement is a vital optimization that IITC lacks.

## Potential Flaws & Performance Risks

### 1. GeoJSON Serialization Bottleneck
IRIS's "Split World" architecture requires large data objects (Intel Arrays -> Typed Store -> GeoJSON Features) to be serialized and sent via `postMessage`.
*   **Risk:** For views with 2000+ portals and 5000+ links, the overhead of `JSON.stringify` and `setData()` processing can cause "Main Thread Jitter," even with coalescing.
*   **Improvement:** Investigate "Dirty Tracking" at the source level to only update FeatureCollections that actually changed.

### 2. "All-or-Nothing" Retry Strategy
IRIS retries at the **Generation** level rather than the **Tile** level.
*   **Risk:** If one batch of 25 tiles fails (e.g., a 400 error or timeout), IRIS eventually retries the *entire* viewport. This is less efficient than IITC's per-tile retry tracking.
*   **Improvement:** Port the `errorCount` per tile-id logic from IITC's `MapDataRequest`.

### 3. Stale Data "Ghosting"
Cleanup in IRIS is distance-based (`ENTITY_CULL_DIST_KM = 50km`) and time-based (5 minutes).
*   **Risk:** Portals or links that have been deleted or moved in Ingress might remain visible in IRIS until the cull timer fires, as there is no "end-of-pass" cleanup that removes entities not seen in the current request.
*   **Improvement:** Introduce a "Pass ID" for entities and remove those not updated by the last successful pass for the current bounds.

### 4. Distributed State Race Conditions
Because communication between the Store (Content) and MapLibre (Page) is asynchronous:
*   **Risk:** Rapid interaction (e.g., selecting a portal while the map is still merging a large update) can lead to temporary "state mismatch" where the UI thinks a portal exists but the map haven't rendered it yet, or vice-versa.

## Why Modern Alternatives Struggle to Match IITC's "Smoothness"

The core challenge in matching the "feel" of IITC is not the language or the library, but the shift from **Imperative Incrementalism** to **Declarative Batching**.

### 1. The `setData()` Hammer vs. Leaflet Mutation
*   **IITC (Leaflet):** When a tile arrives, IITC adds 25 portals. Leaflet creates 25 DOM/SVG elements. The rest of the map remains untouched.
*   **IRIS (MapLibre):** When data arrives, IRIS updates the store and calls `source.setData(allFeatures)`. MapLibre must serialize the entire array, send it to a WebWorker, re-parse it, and rebuild the spatial index.
*   **The Cost:** The CPU cost of a full data sync is orders of magnitude higher than simple DOM insertion, leading to frame-rate drops in dense areas.

### 2. The "Split-World" Serialization Tax
*   **IITC:** Lives entirely in the Page World. AJAX responses are immediately available as JS objects.
*   **IRIS:** Uses a multi-world architecture (`Fetch -> Interceptor -> Content Script -> Page Script`).
*   **The Cost:** Every sync involves stringifying and parsing huge blobs of data across world boundaries. If this happens while the user is mid-pan, a "Main Thread Spike" is inevitable.

### 3. Missing Interaction-Awareness
*   **IITC:** Extremely "cowardly" about rendering. It silences the render queue the moment a pan starts and doesn't resume until seconds after it ends.
*   **IRIS:** Uses `DEFERRED_SOURCE_SYNC_SETTLE_MS` to coalesces updates, but the pressure to be "live" often leads to rendering attempts while the map is still moving.
*   **The "Feel":** IITC feels smooth because it strictly separates movement from data application.

### 4. Batching vs. Streaming
*   **IITC:** Streams data. You see the map "filling in" progressively as requests finish.
*   **IRIS:** Often waits for a generation to "settle" before syncing to the map to avoid flicker.
*   **The Result:** The UI can feel "stuck" for a moment, followed by a massive, jittery update that skips frames.

## Semantic Port Audit: IRIS vs. The Blueprint

To truly match IITC, an app must follow the **Semantic Port Blueprint**. Here is how IRIS scores against the five pillars:

### 1. Interaction-Awareness (The "Cowardly" Model)
*   **Status: ✅ Following**
*   **Evidence:** IRIS implements `ENTITY_MOVE_SETTLE_MS = 3000` (IITC's 3s delay) and `DEFERRED_SOURCE_SYNC_SETTLE_MS = 120`.
*   **Code Depth:** `page-map-runtime.ts` explicitly checks `isMapActivelyMoving()` and buffers data until the map is idle. It also suspends heavy link layers below Zoom 10 during movement.
*   **Result:** IRIS successfully avoids the "Jitter" caused by trying to render data while the user is actively panning.

### 2. Surgical Tile Containment
*   **Status: ✅ Following**
*   **Evidence:** `RequestCoordinator.ts` implements `isCoveredByPreviousDataBounds`.
*   **Code Depth:** IRIS tracks `lastEntityFetchedDataBounds` and `lastEntityFetchedMapZoom`. If a user pans slightly within a recently fetched area, IRIS skips the network request entirely.
*   **Result:** Minimal network waste, matching IITC's efficiency for small adjustments.

### 3. Incrementalism (The "Source Splitting" Pillar)
*   **Status: ❌ Gap**
*   **Evidence:** IRIS still uses the "Snapshot" model.
*   **Observation:** Every time a new tile batch arrives, IRIS builds a *complete* GeoJSON FeatureCollection of all portals in the store and calls `setData()`.
*   **The Flaw:** Unlike IITC, which adds 25 portals to the DOM, IRIS forces MapLibre to re-index the *entire* portal set (often 1000+ items). This is the primary cause of the "stutter" seen when data settles.
*   **Next Action:** Implement **Source Splitting**. Use multiple sources to "stream" tile batches incrementally instead of rebuilding the whole map.

### 4. Evolving the "Split-World" Problem
*   **Status: ⚠️ Partial**
*   **Evidence:** Uses `postMessage` with JSON objects.
*   **Observation:** IRIS parses Intel data in the Content world and sends GeoJSON to the Page world. While this keeps the Page world "clean," the data is still serialized/deserialized as a standard JSON object.
*   **The Flaw:** For 5000+ features, the structured clone algorithm is slow. IRIS is not yet using **Transferable Objects** (ArrayBuffers) or offloading the final serialization to a background worker in the Page world.

### 5. Tile-Granular Retry
*   **Status: ❌ Gap**
*   **Evidence:** Retries are handled at the "Generation" level.
*   **Observation:** If a network error occurs, IRIS retries the whole viewport refresh later. It doesn't track which specific tile-ids failed.
*   **The Flaw:** If one tile out of 400 fails, you get a "hole" in the map that doesn't fix itself until the next full refresh, whereas IITC would immediately retry only that specific hole.

## Analysis of Performance Benchmarking Flaws

While IRIS has a sophisticated diagnostic suite, the current benchmarking implementation has several systematic flaws that can mask real-world performance issues:

### 1. The "Clean Room" Bias
*   **The Flaw:** When a benchmark is active, `panBenchmarkActive` is set to true, causing the runtime to **defer all incoming data updates** until the run is over.
*   **The Impact:** The benchmark measures a "Static Map" only. It completely misses the "setData Hammer" (the main-thread stutter caused by merging new network data), which is the primary performance bottleneck in dense urban areas.

### 2. The "End-to-End" Blind Spot
*   **The Flaw:** Benchmarking logic lives entirely in the Page World (the MapLibre renderer). 
*   **The Impact:** It does not account for the latency or CPU cost of the Extension World (Intel JSON parsing, Zustand store updates, and message serialization). A fast benchmark FPS does not necessarily mean a fast user experience if the data takes 500ms to "travel" to the map.

### 3. Measurement Interference (Heisenberg Effect)
*   **The Flaw:** The benchmarking tool itself (calculating sine-wave pans, projected coordinates, and accumulating frame deltas) runs on the same main thread it is measuring.
*   **The Impact:** On low-end mobile devices, the overhead of the "Bench" tool can artificially lower the recorded FPS, making the performance seem worse than it is during normal usage.

### 4. Threshold Inconsistency
*   **The Flaw:** Core logic (`benchmark-frames.ts`) defaults to **20ms** for "Slow Frames," while the Page Runtime uses **34ms**.
*   **The Impact:** This creates inconsistent diagnostic reports where a single frame might be "Slow" according to the stats but "Normal" according to the runtime log.

## Project Backlog: Achieving the Semantic Port

Based on the audit gaps, the following work is required to bring IRIS to parity with IITC's performance and reliability.

### Epic 1: Incremental Sync Architecture (The "Anti-Stutter" Epic)
**Goal:** Eliminate the "setData Hammer" by moving from full-source snapshots to incremental updates.

*   **Story 1.1: Multi-Source Portal Pooling**
    *   Implement a pool of 10-20 MapLibre sources for portals.
    *   Assign incoming tile batches to the next available source in the pool.
    *   **Benefit:** `setData` will only process 25-50 features at a time instead of 2000+.
*   **Story 1.2: Dirty-Region Tracking**
    *   Compare new tile data against store state before triggering a sync.
    *   Skip `setData` for sources whose data hasn't changed.
*   **Story 1.3: Background Snapshot Worker**
    *   Move the GeoJSON FeatureCollection construction from the Content Script main thread to a dedicated Web Worker.

### Epic 2: Granular Reliability (The "No Holes" Epic)
**Goal:** Port IITC's per-tile error tracking to ensure a robust map state.

*   **Story 2.1: Tile-Granular Retry Logic**
    *   Update `RequestCoordinator` to track `retryCount` and `errorStatus` per `tileId`.
    *   Implement exponential backoff for individual failed tiles.
*   **Story 2.2: Stale-Cache Fallback**
    *   Allow tiles that failed their refresh to stay visible (marked as "stale") rather than being culled or left as holes.
*   **Story 2.3: Pass-Based Entity Cleanup**
    *   Tag entities with a `lastPassId`.
    *   Remove entities that were not part of the last N successful passes within the current viewport.

### Epic 3: Split-World Performance (The "Serialization" Epic)
**Goal:** Minimize the "postMessage tax" between Content and Page worlds.

*   **Story 3.1: Transferable Object Protocol**
    *   Refactor the message protocol to use `ArrayBuffers` (Float32Arrays) for portal coordinates.
    *   **Benefit:** Near-zero cost for moving coordinate data across world boundaries.
*   **Story 3.2: Differential Message Sync**
    *   Only send "Patches" (Created/Updated/Deleted IDs) across the bridge instead of full GeoJSON snapshots.

### Epic 4: IITC Plugin Compatibility
**Goal:** Provide the event hooks necessary for legacy tools.

*   **Story 4.1: Semantic Hook Layer**
    *   Implement typed equivalents for `mapDataRefreshStart`, `portalAdded`, and `portalDetailLoaded`.
    *   Expose these via a compatibility shim for existing IITC plugins.

### Epic 5: Reality-Check Benchmarking
**Goal:** Ensure performance improvements are measured accurately and holistically.

*   **Story 5.1: "Live-Load" Benchmark Mode**
    *   Create a mode that forces `setData` updates to occur *during* the pan animation.
*   **Story 5.2: End-to-End Latency Tracing**
    *   Add a `passTimestamp` to the fetch request to measure total latency from "Network Finish" to "Stable Frame."
*   **Story 5.3: Benchmark Threshold Alignment**
    *   Unify all "Slow Frame" metrics to a consistent 33ms (30fps) or 16ms (60fps) threshold.

## Final Verdict & Performance Roadmap

IRIS is a "Semantic Port" of the IITC request lifecycle, not a literal one. It preserves the hard-won performance heuristics of IITC (tile math, settle delays, containment checks) while adapting them to a modern, split-world architecture.

The current implementation is an excellent foundation, but the "setData Hammer" and "Generation-level Retries" are the primary technical debts preventing it from feeling as robust as the original. Executing **Epic 1** and **Epic 2** should be the highest priority for the next development cycle.

