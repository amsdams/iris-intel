# IRIS
### Ingress Reconnaissance & Intelligence System

A modern, open-source browser extension alternative to IITC — built with TypeScript, Preact, and MapLibre GL.

![License](https://img.shields.io/badge/license-GPL--3.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Manifest](https://img.shields.io/badge/Manifest-V3-green)
![Status](https://img.shields.io/badge/status-PoC-orange)

---

## What is IRIS?

IRIS overlays a fully interactive [MapLibre GL](https://maplibre.org/) map on top of [Ingress Intel](https://intel.ingress.com), intercepting the Intel API to render portals, links and fields in real time. It is designed as a modern, maintainable alternative to [IITC-CE](https://iitc.app/) with a clean TypeScript codebase, a structured plugin API, and first-class mobile browser support.

> **Note:** IRIS is a proof of concept. Use at your own risk and in accordance with Niantic's Terms of Service.

---

## Features

- 🗺️ **MapLibre GL overlay** — smooth WebGL-rendered map over Intel
- 📡 **Real-time entity capture** — portals, links and fields via XHR interception
- 🔄 **Bidirectional map sync** — pan either map, both follow
- 🏛️ **Portal details** — name, image, level, health, owner, resonators and mods on click
- 👤 **Player stats** — agent name, level, AP and faction from Intel DOM
- 🔍 **Location search** — Nominatim/OpenStreetMap geocoding with result dropdown
- 📍 **Geolocation** — navigate to your current position
- 🧩 **Plugin system** — structured manifest API with `setup()`/`teardown()` lifecycle
- ⚡ **Lightweight** — Preact (3kb) + Zustand (1.5kb), no heavy framework

---

## Screenshots

> _Add screenshots here once UI is polished_

---

## Architecture

```
IRIS/
├── packages/
│   ├── extension/          # Browser extension (Manifest V3)
│   │   ├── manifest.json
│   │   └── src/
│   │       ├── content/    # Content script + main-world interceptor
│   │       ├── ui/         # Preact components (Overlay, MapOverlay, Popup)
│   │       └── core/       # Re-exports from @iris/core
│   ├── core/               # Zustand store, types, plugin manager
│   └── plugins/            # First-party plugins (portal-names, etc.)
```

### How it works

```
Intel page loads
    │
    ▼
Interceptor (main world, document_start)
  ├── Hooks google.maps.Map constructor → captures map instance
  ├── Patches XMLHttpRequest.prototype → intercepts getEntities / getPortalDetails
  └── Wraps window.fetch → same endpoints
    │
    ▼
postMessage → Content script (isolated world)
    │
    ▼
Zustand store (portals, links, fields, mapState)
    │
    ▼
Preact + MapLibre GL renders overlay
```

The XHR interceptor uses **prototype patching** (not subclassing) because Intel's internal code captures a reference to `XMLHttpRequest` before the extension runs. Patching the prototype mutates the object Intel already holds a reference to — subclassing would be invisible to it.

---

## Installation (Development)

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
git clone https://github.com/yourusername/iris-intel.git
cd iris-intel
npm install
npm run build
```

### Load in Chrome / Chromium

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `packages/extension/dist` folder
5. Navigate to `https://intel.ingress.com`

### Load in Firefox

1. Open `about:debugging`
2. Click **This Firefox** → **Load Temporary Add-on**
3. Select `packages/extension/dist/manifest.json`

---

## Plugin System

Plugins declare a manifest and receive a typed API:

```typescript
import type { PluginDefinition } from '@iris/core';

const MyPlugin: PluginDefinition = {
  manifest: {
    id: 'com.github.yourname.my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    minCoreVersion: '>=0.1.0',
    description: 'Does something useful',
    author: 'Your Name',
    permissions: ['portals:read', 'map:overlay'],
  },
  setup(api) {
    api.portals.onChange((portals) => {
      console.log('Portal count:', Object.keys(portals).length);
    });
  },
  teardown() {
    // cleanup
  },
};

export default MyPlugin;
```

---

## Data Sources

| Data | Source |
|------|--------|
| Portal / link / field entities | `intel.ingress.com/r/getEntities` |
| Portal details | `intel.ingress.com/r/getPortalDetails` |
| Map tiles | OpenStreetMap (via MapLibre GL) |
| Geocoding | Nominatim / OpenStreetMap |
| Player stats | Intel page DOM |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Manifest V3, Chrome / Firefox |
| UI framework | [Preact](https://preactjs.com/) |
| Map rendering | [MapLibre GL JS](https://maplibre.org/) |
| State management | [Zustand](https://github.com/pmndrs/zustand) |
| Build tool | [Vite](https://vitejs.dev/) + `vite-plugin-web-extension` |
| Language | TypeScript (strict) |
| Package manager | npm workspaces |

---

## Roadmap

- [x] XHR / fetch interception
- [x] Portal, link and field rendering
- [x] Bidirectional map sync
- [x] Portal details popup
- [x] Player stats
- [x] Location search
- [x] Plugin system (basic)
- [ ] Hide Intel UI — MapLibre-only mode
- [ ] Mobile browser support (Android Chrome / Firefox)
- [ ] iOS Safari Web Extension
- [ ] Structured plugin manifest with permissions
- [ ] Plugin enable / disable at runtime
- [ ] Chat / Comms overlay
- [ ] Dark / light map theme toggle
- [ ] Export portal data (GeoJSON, CSV)

---

## Legal & Ethics

IRIS is an independent open-source project and is not affiliated with or endorsed by Niantic, Inc.

Using third-party tools with Ingress Intel may violate [Niantic's Terms of Service](https://www.nianticlabs.com/terms). IRIS operates in the same manner as IITC-CE — passively intercepting data that your browser loads anyway, without modifying game state or making unauthorised requests.

Use IRIS responsibly and at your own risk.

---

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for significant changes.

- Bug reports → GitHub Issues
- Feature requests → GitHub Discussions
- Pull requests → `main` branch, squash commits

---

## License

IRIS core is licensed under [GPL-3.0](LICENSE).
The plugin SDK (`@iris/core`) is licensed under [MIT](packages/core/LICENSE).

Plugin authors may use any licence for their own plugins.

---

## Acknowledgements

Inspired by [IITC-CE](https://iitc.app/) and the Ingress community. Built on the shoulders of [MapLibre GL](https://maplibre.org/), [Preact](https://preactjs.com/), and [OpenStreetMap](https://www.openstreetmap.org/).
