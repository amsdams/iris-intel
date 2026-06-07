# iris-intel

Browser-extension experiments for Ingress Intel, currently focused on **IITC-IRIS**: a TypeScript/Preact/Leaflet extension that smart-ports IITC-CE behavior into a maintainable modern codebase.

![License](https://img.shields.io/badge/license-GPL--3.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-blue)
![Manifest](https://img.shields.io/badge/Manifest-V3-green)
![Status](https://img.shields.io/badge/status-Active-orange)

## Current Focus

### IITC-IRIS

`apps/iitc-iris` is the main active product. Its goal is not to make a new MapLibre overlay, but to preserve IITC-CE semantics where they matter: Leaflet map behavior, entity lifecycle, portal details, COMM, scores, inventory, missions, player tracker, Draw Tools links/markers, and IITC-compatible data formats.

Start here for current work:

- [IITC-IRIS port plan](docs/iitc-iris/port-plan.md)
- [IITC-IRIS feature notes](docs/iitc-iris/features/)
- [IITC-IRIS backlog](docs/iitc-iris/backlog.md)

### Earlier POCs

`apps/iris` and `apps/mini-iris` came first. They proved a lot of useful pieces: Intel request interception, page-world map runtime, mobile shell ideas, diagnostics, shared parsing/store code, and packaging. They also exposed the main weakness of the MapLibre-first approach: dense Intel areas and live update churn are hard to make feel as smooth as IITC without copying more of IITC's lifecycle model.

Those apps remain useful references, but they are not the main direction right now.

`ISTS` was also an earlier proof-of-concept direction. Treat it as historical context rather than the active implementation path.

## Repository Layout

```text
apps/
  iitc-iris/     Active IITC-style browser extension
  iris/          Earlier full IRIS MapLibre extension
  mini-iris/     Earlier compact/mobile POC
packages/
  iitc-core/     IITC-compatible parsing, geometry, request, and Draw Tools logic
  core/          Shared IRIS/Mini-IRIS store, parsers, and plugin manager
  plugin-sdk/    IRIS plugin-facing API/types
  plugins/       First-party IRIS plugins
docs/
  iitc-iris/     Active IITC-IRIS plans, feature notes, backlog, research
  iris/          IRIS architecture, worklog, benchmarks, samples
  iris-mini/     Mini-IRIS docs index
```

## What IITC-IRIS Does Today

- Renders portals, links, fields, artifacts, ornaments, missions, and selected portal state with Leaflet.
- Uses IITC-style request lifecycle concepts for map data and side-panel endpoints.
- Provides portal details, COMM, scores, inventory, passcodes, search, missions, and player tracker surfaces.
- Supports Draw Tools v1 for IITC-compatible links and markers, including import/export with IITC Draw Tools data.
- Packages as Chrome ZIP and Firefox XPI browser extensions.

IITC-IRIS deliberately does not yet expose a broad IITC plugin compatibility layer such as global `window.plugin.*`, `addHook`, toolbox, highlighter registry, or full Leaflet.draw event parity. Those are future decisions after the core user-facing parity is stable.

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
npm install
npm run lint:iitc-iris
npm run typecheck:iitc-iris
npm run package:iitc-iris
```

### Command Matrix

| Target | Build | Check | Clean | Package | Release |
|---|---|---|---|---|---|
| `iitc-core` | `npm run build:iitc-core` | `npm run check:iitc-core` | `npm run clean:iitc-core` | None | None |
| `iitc-iris` | `npm run build:iitc-iris` | `npm run check:iitc-iris` | `npm run clean:iitc-iris` | `npm run package:iitc-iris` | `npm run release:iitc-iris` |
| `core` | `npm run build:core` | `npm run check:core` | `npm run clean:core` | None | None |
| `iris` | `npm run build:iris` | `npm run check:iris` | `npm run clean:iris` | `npm run package:iris` | `npm run release:iris` |
| `mini-iris` | `npm run build:mini-iris` | `npm run check:mini-iris` | `npm run clean:mini-iris` | `npm run package:mini-iris` | `npm run release:mini-iris` |
| `all` | `npm run build:all` | `npm run check:all` | `npm run clean:all` | `npm run package:all` | `npm run release:all` |

Command semantics:

- `build:*` creates unpacked browser-extension output for local loading.
- `package:*` creates timestamped ZIP/XPI files and refreshes unpacked output first.
- `release:*` currently aliases the matching product package flow.
- For current work, prefer the IITC-IRIS commands first.

Package outputs:

- IITC-IRIS unpacked build: `apps/iitc-iris/dist`.
- IITC-IRIS packages: `apps/iitc-iris/builds/iitc-iris-chrome-<version>-<timestamp>.zip` and `apps/iitc-iris/builds/iitc-iris-firefox-<version>-<timestamp>.xpi`.
- IRIS unpacked builds: `apps/iris/dist/chrome` and `apps/iris/dist/firefox`.
- IRIS packages: `apps/iris/builds/iris-chrome-<version>-<timestamp>.zip` and `apps/iris/builds/iris-firefox-<version>-<timestamp>.xpi`.
- Mini-IRIS unpacked build: `apps/mini-iris/dist`.
- Mini-IRIS packages: `apps/mini-iris/builds/mini-iris-chrome-<version>-<timestamp>.zip` and `apps/mini-iris/builds/mini-iris-firefox-<version>-<timestamp>.xpi`.

## Load IITC-IRIS Locally

### Chrome / Chromium

1. Run `npm run build:iitc-iris` or `npm run package:iitc-iris`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select `apps/iitc-iris/dist`.
6. Navigate to `https://intel.ingress.com`.

### Firefox

1. Run `npm run build:iitc-iris` or `npm run package:iitc-iris`.
2. Open `about:debugging`.
3. Click This Firefox, then Load Temporary Add-on.
4. Select `apps/iitc-iris/dist/manifest.json`.
5. Navigate to `https://intel.ingress.com`.

## Documentation

- [Docs index](docs/README.md)
- [IITC-IRIS port plan](docs/iitc-iris/port-plan.md)
- [IRIS architecture notes](docs/iris/architecture.md)
- [Mini-IRIS docs](docs/iris-mini/README.md)

## Legal And Ethics

This project is independent and is not affiliated with or endorsed by Niantic, Inc.

Using third-party tools with Ingress Intel may violate [Niantic's Terms of Service](https://www.nianticlabs.com/terms). The extensions in this repository operate by observing data that the browser loads for Intel and do not modify game state.

Use at your own risk.

## License

GPL-3.0. See [LICENSE](LICENSE).
