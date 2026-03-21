# Plan: IITC-Next Architecture (Updated)

## Objective
Create a modern, lightweight, and high-performance IITC alternative. The initial goal is a **Desktop Proof of Concept (POC)** as a Browser Extension (Manifest V3), with a shared core that can later support a Capacitor mobile app or mobile browser extensions.

## Technical Stack (The "Claude + Gemini" Hybrid)
- **Framework:** [Preact](https://preactjs.com/) (3KB React-compatible library for UI).
- **Build Tool:** [Vite](https://vitejs.dev/) with `vite-plugin-web-extension`.
- **Mapping Engine:** [MapLibre GL JS](https://maplibre.org/) (WebGL-accelerated for high-density portal maps).
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) (Simple, typed reactive state).
- **Extension API:** Manifest V3 (Cross-browser compatibility).
- **Monorepo:** [pnpm workspaces](https://pnpm.io/workspaces) (Clean, fast, and standard for Vite).

## Project Structure
```text
ittca/
├── packages/
│   ├── core/           # Shared logic: Portal store (Zustand), Map API, Types
│   ├── extension/      # Manifest V3 Extension (Desktop/Mobile Browsers)
│   │   ├── src/
│   │   │   ├── content/    # XHR/Fetch Interceptor (Injected into Ingress)
│   │   │   ├── background/ # Service Worker
│   │   │   └── ui/         # Preact + MapLibre Overlay
│   ├── plugin-sdk/     # TypeScript interfaces for community plugins
│   └── plugins/        # First-party plugins (Heatmap, Portal Names, etc.)
├── docs/               # Architecture and Plan
└── pnpm-workspace.yaml # Monorepo configuration
```

## Implementation Plan

### Phase 1: Scaffolding & Core (POC)
1.  **Monorepo Setup:** Initialize pnpm workspaces and basic TypeScript configuration.
2.  **Extension Skeleton:** Create a Manifest V3 extension with a background service worker and a content script.
3.  **XHR Interception:** Implement the "Main World" injection script to capture `/r/getEntities` and `/r/getPortalDetails` from Ingress Intel.
4.  **Data Store:** Create the Zustand store in `@ittca/core` to manage portal/link/field data.

### Phase 2: Map Rendering (POC)
1.  **Overlay UI:** Inject a Preact-based overlay onto the Intel map.
2.  **MapLibre Integration:** Render a "Mirrored Map" using MapLibre GL that stays in sync with the Intel Map's position but renders captured data with WebGL.
3.  **Basic Styling:** Minimalist, modern dark-mode aesthetic.

### Phase 3: Plugin System
1.  **SDK Definition:** Finalize the `IitcPlugin` interface and lifecycle (`setup`, `teardown`).
2.  **Plugin Loader:** Implement the logic to dynamically load/unload plugins from the `plugins/` directory.

### Phase 4: Mobile & Refinement
1.  **Mobile Strategy Decision:** Evaluate whether to pursue a Capacitor App wrapper (for iOS/Android) or stay with Browser Extensions (Kiwi/Firefox).
2.  **UI Polish:** Mobile-optimized touch gestures and responsive sidebars.

## Verification & Testing
- **Network Validation:** Verify that intercepted portal data matches the raw JSON from Niantic.
- **Performance:** Ensure the MapLibre overlay maintains 60fps even with dense fields.
- **Strict Typing:** All captured data must be validated against TypeScript interfaces before entering the store.

## Future Considerations
- **Offline Mode:** Caching portal data for "Intel-free" map viewing.
- **Collaboration:** Real-time sharing of map markers with teammates.
