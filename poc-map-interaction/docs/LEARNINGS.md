# POC Map Interaction: Learnings & Progress

This document summarizes the findings from the `poc-map-interaction` project and outlines actionable steps for improving
IRIS based on these architectural and interactive breakthroughs.

## 1. Key Learnings & Progress

### Performance & Spatial Indexing [DONE]

* **Persistent Spatial Index**: Using a dedicated R-Tree (`rbush`) to index all entities (Portals, Links, Fields) is
  critical for performance. Iterating through thousands of entities on every move is not viable.
  * *Status: Implemented in `@iris/core/SpatialIndex.ts`.*
* **Viewport Filtering**: By querying the R-Tree for only the current viewport (plus a small buffer), we can reduce the
  number of features sent to MapLibre from tens of thousands to a few hundred, keeping the map responsive even in
  extremely dense areas.
  * *Status: Integrated into `MapOverlay.tsx` via `globalSpatialIndex.query`.*
* **Gradual Data Loading**: Implementing level-based filtering (mimicking Ingress Intel) is essential. Zooming out
  should render fewer, higher-level portals and their associated links/fields to prevent visual clutter and CPU
  exhaustion.
  * *Status: Centralized in `ZoomPolicy.ts` and enforced in rendering.*

### Interaction & Clicks [NEW]

* **Balanced Click Priority**: We implemented a "Balanced" priority system (**Portals (10px) > Fields (Inside) > Links (5px)**)
  using screen-space pixel distances (`map.project`). This solved the "Impossible to click field" problem while
  maintaining precise snapping for small anchors and lines.
* **Selection Highlighting**: Providing instant visual feedback (white rings for portals, glowing lines for links, and
  thick outlines for fields) is critical for a "Tactical" feel.
* **Nesting Layer Selection**: When multiple fields overlap (the "darkest" areas), the logic now explicitly selects the
  **top-most (highest layer)** field, which is the smallest/inner-most one.

### 3. The Extrusion & Tactical Sandbox [EVOLVED]

The 3D experiment transformed from a simple extrusion test into a high-fidelity "Digital Tactical Overlay":

* **Glass Panes (Field Stacking)**: Overlapping fields are rendered at different altitudes based on their nesting level.
* **Energy Tethers**: Vertical pillars connect the base portals to their floating fields, grounding the 3D projection.
* **Cylindrical Hubs**: Approximating smooth cylinders (12-sided polygons) for portals makes them feel like hubs rather than boxes.
* **Floating Energy Rails**: Links float at the altitude of their corresponding fields, creating a cohesive "framed glass" look.
* **Dynamic Tower Heights**: Portal towers intelligently scale to meet the highest field they anchor, then stop with a small "cap."
* **Cinematic Camera**: Smoothly transitioning the pitch/bearing when entering 3D mode provides immediate immersion.

### 4. Link-Driven Data Model [NEW]

We refactored the POC to match Ingress's logic:
* **Implicit Fields**: Fields are no longer manually added. They are automatically created when a triangle of links is closed.
* **Automatic Layering**: Nesting levels are calculated automatically using Point-in-Polygon checks, removing the need for manual depth management.

---

## 2. Actionable Steps for IRIS Improvement

### Immediate Wins (Interaction)

1. **Direct RBush Interaction**: Port the POC's global click handler to IRIS, bypassing MapLibre's native hit detection entirely for entity clicks.
    * *Status: READY FOR PORT.*
2. **Simplified Z-Ordering**: Adopt the POC's layering (Map at Z:1, UI at Z:9999 with transparent passthrough) but ensure click events are captured by the Map container reliably.
    * *Status: READY FOR PORT.*
3. **Layered Field Count**: Implement the `isPointInField` (Point-in-Triangle) test to show the exact number of
   overlapping field layers when clicking.
    * *Status: DONE IN POC.*

### Future Pivot Strategy (Next Session)

#### 1. The "Mini-IRIS" Roadmap
The goal is to evolve this POC into a high-performance "Tactical View" that can either run as a standalone debugger or a lightweight map engine for real data.

*   **Dual-Source Architecture**:
    *   **Simulation Mode**: Retain the `MockDataGenerator` for rapid prototyping of new 3D effects and pattern testing (like the Nested Diamond).
    *   **Live Mode**: Replace the generator calls with a subscription to the real `@iris/core` store, allowing the POC logic to render real-world Intel data.
*   **Modular Port**: Convert the POC `content.ts` into a reusable module that can be injected into the main IRIS extension as an alternative "High-Fidelity" map view.

#### 2. Immediate Wins (Interaction)
1.  **Direct RBush Interaction**: Port the POC's global click handler to IRIS, bypassing MapLibre's native hit detection entirely for entity clicks.
    *   *Status: READY FOR PORT.*
2.  **Simplified Z-Ordering**: Adopt the POC's layering (Map at Z:1, UI at Z:9999 with transparent passthrough) but ensure click events are captured by the Map container reliably.
    *   *Status: READY FOR PORT.*
3.  **Layered Field Count**: Implement the `isPointInField` (Point-in-Triangle) test to show the exact number of
   overlapping field layers when clicking.
    *   *Status: DONE IN POC.*

## 4. Progress Summary Table

| Feature                | POC Status            | IRIS Status                       |
|:-----------------------|:----------------------|:----------------------------------|
| **Spatial Indexing**   | Full (RBush)          | **DONE** (Core optimization)      |
| **Viewport Sync**      | Optimized             | **DONE** (Rendering speed)        |
| **Mobile Clicks**      | Robust (Balanced)     | **REVISIT** (Broken in IRIS)      |
| **Nesting Detection**  | Automatic (PiP)       | NEXT (UX)                         |
| **3D Tactical Overlay**| Advanced Prototype    | Experimental Plugin               |
| **Link-Driven Fields** | Fully Functional      | **DONE** (Core Logic)             |
| **Cinematic Camera**   | Implemented           | PENDING                           |
