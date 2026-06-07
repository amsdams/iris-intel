# IRIS Technical Design: Surgical Sync & Hot/Cold Partitioning

This document outlines the refined technical strategy for eliminating the "setData Hammer" in IRIS. 

**The Practical Target:** Call `setData` only for changed, appropriately small sources, and avoid doing heavy calls during movement unless the update is urgent.

## Architectural Pillars

### 1. Hot/Cold Source Partitioning
Instead of one giant source for portals, we split the data into two logical layers in the Page World:

*   **The "Stable" Source (Cold):** 
    *   Contains the bulk of the portal data (entities that have existed in the store for > 1 minute).
    *   **Sync Policy:** "Lazy". Only updated when `map.isMoving() === false` AND `map.isIdle() === true`.
*   **The "Live" Sources (Hot):**
    *   A pool of 5 small GeoJSON sources.
    *   New incoming network responses (batches of 25 tiles) are assigned to the next available "Live" source.
    *   **Sync Policy:** "Aggressive". These sources are small enough to be updated immediately, even during map movement, matching IITC's progressive fill behavior.

### 2. Urgency-Aware Sync Dispatcher
We implement a three-lane dispatcher for all map synchronization messages:

| Lane | Examples | Performance Budget | Strategy |
| :--- | :--- | :--- | :--- |
| **URGENT** | Portal Selection, Draw Tools, Manual Refresh | < 5ms | **Immediate.** Sync to a dedicated "Overlay" source. |
| **LIGHT** | Incoming `getEntities` (25 tiles) | < 10ms | **Streaming.** Pick the next available "Live" source and update immediately. |
| **HEAVY** | Full Map Refresh, Culling, Zoom Changes | > 50ms | **Idle-Only.** Buffer the change and flush only when the map is settled and idle. |

### 3. Dirty-Tile Tracking
To avoid the "postMessage Tax," we add a lightweight hashing layer to the Snapshot Builder:
*   Before sending a message to the Page World, compute a 32-bit hash of the GeoJSON partition.
*   If the hash matches the last sent version for that partition, skip the `postMessage` and the `setData` call entirely.

## Project Backlog

### Epic 1: Surgical Sync Implementation
*   **Story 1.1: Multi-Source Bridge Protocol**
    *   Update the `IRIS_PAGE_MAP_RUNTIME_SYNC_DATA` message to include a `targetSourceId`.
    *   Modify `page-map-runtime.ts` to dynamically register and manage the "Stable" and "Live" source sets.
*   **Story 1.2: The Three-Lane Dispatcher**
    *   Implement the priority logic in the `RequestCoordinator` or a dedicated `SyncDispatcher` module.
    *   Add state monitoring for `map.isMoving()` and `map.isIdle()`.
*   **Story 1.3: Hash-Based Skip Logic**
    *   Implement dirty-tracking in the `SnapshotBuilder` to suppress redundant updates for untouched source partitions.

## Verification & Metrics
*   **Target:** `setDataMs` for streaming updates should stay below **10ms**.
*   **Target:** Zero "Long Tasks" (> 50ms) triggered by map sync during movement.
*   **Target:** "Stable" source sync should only occur during confirmed quiet windows in the benchmark tool.
