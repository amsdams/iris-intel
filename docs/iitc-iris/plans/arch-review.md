# Architectural Review: Maintainability, LOC & Domain Separation — 2026-11-04

This review captures findings and targeted recommendations from an architectural inspection of [`apps/iitc-iris`](file:///Users/jula/ittca/apps/iitc-iris) and [`packages/iitc-core`](file:///Users/jula/ittca/packages/iitc-core). The focus is identifying high-LOC hotspots, unnecessary duplication, pass-through boilerplate, and opportunities for clearer domain/feature decomposition while strictly maintaining observable behavior and message/storage contracts.

---

## 1. Top High-LOC Production Files

An audit of production files (`*.ts`, `*.tsx`, excluding tests) highlights the following concentration of code:

| File | LOC | Mixed Concerns / Responsibilities |
|---|---|---|
| [`map-renderer.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/map/entities/map-renderer.ts) | **1,644** | Core entity layer sync, ornament/artifact canvas sync, portal style/radius math, level/key text labels |
| [`content.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/content.tsx) | **1,161** | App root injection, 928-line [`App()`](file:///Users/jula/ittca/apps/iitc-iris/src/content.tsx#L177-L1105) component, COMM draft/scroll state, shell navigation, message dispatching |
| [`map-request.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/map/map-request.ts) | **947** | Map tile request queue & debounce loop, Intel `getEntities` payload decoding, queue/render diagnostics |
| [`messages.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/messages.ts) | **813** | God-object interface ([`IitcIrisMessage`](file:///Users/jula/ittca/apps/iitc-iris/src/messages.ts#L54) with 120+ fields), 43 message types, entity render models |
| [`map-data-request.ts`](file:///Users/jula/ittca/packages/iitc-core/src/map-data-request.ts) | **787** | High-level request lifecycle state alongside low-level IITC retry-sieve and tile-bucket partitioning |
| [`page-map-runtime.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/page-map-runtime.ts) | **664** | Subsystem composition root, Leaflet event listeners, map cookie synchronization, window message router |
| [`comm-runtime.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/comm/comm-runtime.ts) | **443** | Channel buffers/cursors, network polling interval/visibility suspension, portal activity derivation |
| [`content-command-callbacks.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/content-command-callbacks.ts) | **441** *(+814 test)* | Pure pass-through forwarding wrappers delegating to underlying actions |
| [`draw-tools-runtime.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/map/draw-tools/draw-tools-runtime.ts) | **434** | LocalStorage/JSON I/O, Leaflet SVG/path layer instantiation, link crossing calculations |
| [`storage-settings.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/shell/storage-settings.ts) | **387** | Repetitive `try/catch` storage wrappers across 10+ unrelated features |

---

## 2. Proposed Domain & Feature Splits

### A. [`map-renderer.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/map/entities/map-renderer.ts) (1,644 LOC)
The closure [`createMapRenderer`](file:///Users/jula/ittca/apps/iitc-iris/src/map/entities/map-renderer.ts#L79-L1644) spans 1,565 lines with ~40 nested functions. It can be split cleanly into four distinct modules:
- **`map-renderer-style.ts` (~200 LOC)**: Pure calculations for marker radius, level scaling, health fill, and colors (`getPortalLevel`, `getPortalRadius`, `getPortalWeight`, `getPortalFillColor`, `getPortalHealthFillOpacity`).
- **`map-renderer-decorations.ts` (~350 LOC)**: Canvas management for ornaments and artifacts (`syncDecorations`, `loadOrnamentVisibilitySettings`).
- **`map-renderer-labels.ts` (~300 LOC)**: Canvas text overlays for portal level numbers and inventory key counts (`syncLevelLabels`, `syncKeyLabels`, `getKeyBadges`).
- **[`map-renderer.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/map/entities/map-renderer.ts) (~800 LOC)**: Retains core portal, link, and field Leaflet layer group diffing and synchronization.

### B. [`content.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/content.tsx) (1,161 LOC)
[`App()`](file:///Users/jula/ittca/apps/iitc-iris/src/content.tsx#L177-L1105) contains over 30 `useState` and `useRef` calls. Extracting cohesive hooks isolates unrelated re-renders:
- **`comm/use-comm-ui-state.ts` (~120 LOC)**: Tab draft dictionary, scroll position preservation across older history fetches, stick-to-bottom refs, and delivery acknowledgment tracking.
- **`shell/use-shell-navigation.ts` (~80 LOC)**: Active sheet, side panel, map focus mode, and shortcut toggle state.
- **`shell/AppShell.tsx` (~450 LOC)**: Pure layout template for mounting modals, sheets, and docks, reducing [`content.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/content.tsx) to <250 LOC.

### C. [`map-request.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/map/map-request.ts) (947 LOC)
Separating Intel transport/data transformation from scheduling logic:
- **`map-entity-decoder.ts` (~250 LOC)**: Pure decoders transforming raw tile responses and artifacts into [`IitcIrisRenderEntities`](file:///Users/jula/ittca/apps/iitc-iris/src/messages.ts#L687) (`toRenderEntities`, `toArtifactRawGameEntity`, `filterIitcGetEntitiesResponseToTiles`).
- **`map-request-diagnostics.ts` (~150 LOC)**: Render queue diagnostics and tile timing counters.
- **[`map-request.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/map/map-request.ts) (~550 LOC)**: Exclusively owns queue scheduling, generation guards, tile cache reuse, and abort signals.

### D. [`messages.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/messages.ts) (813 LOC)
Decompose the flat God-object into a modular `messages/` hierarchy:
- **`messages/map.ts`**: SetView, PanBy, MapMoved, RenderEntities, LayerSettings.
- **`messages/comm.ts`**: CommStatus, RequestComm, SendComm, PortalActivity.
- **`messages/features.ts`**: Scores, Passcode, Inventory, Missions, Search, DrawTools.
- **`messages/entities.ts`**: Portal, Link, and Field render interfaces.

### E. [`comm-runtime.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/comm/comm-runtime.ts) (443 LOC)
- **`comm-portal-timeline.ts` (~100 LOC)**: Pure derivation of the latest 100 public events matching the selected portal GUID/coordinates.
- **`comm-poller.ts` (~120 LOC)**: Interval calculation, tab-visibility pausing, and area-change boundary checks.
- **[`comm-runtime.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/comm/comm-runtime.ts) (~220 LOC)**: Channel buffers, cursors, and message sending.

---

## 3. Ten Minimal Architectural Improvements

These targeted improvements reduce boilerplate, prevent runtime bugs, and streamline maintenance without touching observable contracts:

1. **Eliminate Pass-Through Callbacks Layer ([`content-command-callbacks.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/content-command-callbacks.ts))**
   - *Action:* Remove the 1:1 wrapper functions and their mirror test suite ([`content-command-callbacks.test.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/content-command-callbacks.test.ts)). Call actions directly in `content.tsx`.
   - *Impact:* **~1,200 LOC removed**.

2. **Generic Typed Storage Helper ([`storage-settings.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/shell/storage-settings.ts))**
   - *Action:* Introduce generic `readStorage<T>(key, fallback, parser)` and `writeStorage<T>(key, value)` utilities.
   - *Impact:* Replaces ~20 duplicate `try/catch` blocks; saves **~180 LOC** and centralizes error handling.

3. **Decompose [`App()`](file:///Users/jula/ittca/apps/iitc-iris/src/content.tsx#L177-L1105) into Focused Domain Hooks**
   - *Action:* Extract `useCommUiState`, `useShellNavigation`, and `useAppShortcuts`.
   - *Impact:* Shrinks 928-LOC function to <250 LOC; isolates unrelated state re-renders.

4. **Eliminate Window Message Listener Re-subscription Churn**
   - *Action:* In [`content.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/content.tsx#L710-L751), replace the 10-dependency array on `window.addEventListener('message')` with a persistent context ref.
   - *Impact:* Stops listener teardown and re-registration during map zooms and layer clicks.

5. **Hoist Pure Math Functions in [`map-renderer.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/map/entities/map-renderer.ts)**
   - *Action:* Move pure style and radius functions out of the [`createMapRenderer`](file:///Users/jula/ittca/apps/iitc-iris/src/map/entities/map-renderer.ts#L79-L1644) closure.
   - *Impact:* Enables isolated unit testing of marker styling without Leaflet mocking; cuts closure complexity.

6. **Hoist Pure Converters in [`map-request.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/map/map-request.ts)**
   - *Action:* Move tile converters and type guards outside [`createMapRequest`](file:///Users/jula/ittca/apps/iitc-iris/src/map/map-request.ts#L121-L947); delete redundant wrappers like `isAuthLikeError`.
   - *Impact:* Removes ~80 lines from the scheduler closure.

7. **Consolidate Entity Diagnostics Mapping ([`message-adapter.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/shell/message-adapter.ts))**
   - *Action:* In [`entityFetchStateFromMessage`](file:///Users/jula/ittca/apps/iitc-iris/src/shell/message-adapter.ts#L117-L187), group diagnostic fields or use an explicit typed patch helper instead of 40 individual null-coalescing assignments.
   - *Impact:* Cuts ~50 LOC and prevents field-omission bugs on new diagnostic metrics.

8. **Deduplicate Entity Interfaces in [`messages.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/messages.ts)**
   - *Action:* Derive [`IitcIrisSelectedPortal`](file:///Users/jula/ittca/apps/iitc-iris/src/messages.ts#L719) from [`IitcIrisRenderPortal`](file:///Users/jula/ittca/apps/iitc-iris/src/messages.ts#L699) rather than restating 14 identical properties.
   - *Impact:* Prevents schema drift across map overlays and portal detail panels.

9. **Consolidate Shell Copy Feedback State**
   - *Action:* Replace three parallel `useState`/`setTimeout` sets (`systemCopyStatus`, `contextCopyStatus`, `portalCopyStatus`) in [`content.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/content.tsx#L186-L188) with a single `useCopyFeedback()` hook.
   - *Impact:* Cuts ~35 LOC of timer and state boilerplate.

10. **Move Pure Portal Analysis Math to [`packages/iitc-core`](file:///Users/jula/ittca/packages/iitc-core/src/portal-analysis.ts)**
    - *Action:* Relocate pure aggregation math from [`apps/iitc-iris/src/map/portal-analysis/portal-analysis.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/map/portal-analysis/portal-analysis.ts) into [`packages/iitc-core/src/portal-analysis.ts`](file:///Users/jula/ittca/packages/iitc-core/src/portal-analysis.ts).
    - *Impact:* Enforces the core vs. app boundary defined in [SKILL.md](file:///Users/jula/ittca/SKILL.md) and makes analysis math runnable without DOM fixtures.
