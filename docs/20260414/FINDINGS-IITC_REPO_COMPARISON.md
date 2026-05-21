# Findings: IRIS Compared With The IITC Repo

> Historical note, May 2026: this April 2026 comparison is retained as
> reference material. It predates the page-world MapLibre runtime, owned entity
> refresh follow-ups, expanded Bench variants, Draw Tools baseline, and player
> tracker pin work. Use `docs/IRIS_ARCHITECTURE.md`,
> `docs/PAGE_WORLD_MAP_RUNTIME.md`, and `docs/WORK_ITEMS.md` for current
> architecture and priorities.

## Scope
This document compared IRIS as it existed in April 2026 against the local IITC repo at [`../ingress-intel-total-conversion`](../../ingress-intel-total-conversion/README.md).

It is focused on:

- runtime data flow
- live map update ownership
- portal/entity decoding
- artifacts
- ornaments
- highlighters and plugin shape

## Executive Summary
The biggest architectural difference is that IITC is a hook-driven, imperative Leaflet application, while IRIS is a store-driven MapLibre overlay layered on top of Intel.

That difference has several consequences:

- IITC owns map-data refresh policy directly for core entity data.
- IITC updates individual portal marker objects incrementally as richer data arrives.
- IITC treats artifacts and ornaments as first-class core overlay systems, not generic plugins.
- IITC highlighters are globally exclusive by design.
- IRIS is cleaner for typed state and modern UI composition, but some IITC behaviors are more deliberate because they are specialized subsystems rather than generic map-feature overlays.

## IITC Runtime Model

### 1. Core map-data refresh is scheduler-owned
IITC has a dedicated map-data request engine in [map_data_request.js](../../ingress-intel-total-conversion/core/code/map_data_request.js:1).

Key properties:

- owns startup refresh timing
- reacts to `movestart` and `moveend`
- uses its own queue, request limit, tile batching, retry policy, and render batching
- tracks fetched bounds and can avoid unnecessary fetches when the new viewport is still covered
- combines cache, request queue, and render queue ownership in one subsystem

Related request status handling lives in [request_handling.js](../../ingress-intel-total-conversion/core/code/request_handling.js:1).

### 2. Core entity updates are incremental and object-oriented
IITC decodes portal arrays into layered detail levels in [entity_decode.js](../../ingress-intel-total-conversion/core/code/entity_decode.js:120):

- `core`
- `summary`
- `detailed`
- `extended`

Portal marker instances then merge newer or richer data in place in [portal_marker.js](../../ingress-intel-total-conversion/core/code/portal_marker.js:47).

Important details:

- placeholder portals can later become full portals
- same-timestamp updates can still enrich the object with more fields
- history is merged carefully rather than blindly replaced
- selected portals and artifact-interest portals are treated specially during cleanup/rendering

### 3. Render ownership is explicit
IITC separates decode/request concerns from render concerns in [map_data_render.js](../../ingress-intel-total-conversion/core/code/map_data_render.js:1).

Render-specific behavior includes:

- clearing off-screen entities
- preserving selected or artifact-relevant portals
- creating fields, links, then portals in that order
- bringing portals to front after render passes
- calling ornament add/remove hooks when portal markers are created or deleted

### 4. Artifacts are a dedicated subsystem
Artifacts are not just another layer toggle in IITC. They have a full core module in [artifact.js](../../ingress-intel-total-conversion/core/code/artifact.js:1).

What IITC does:

- polls `getArtifactPortals`
- decodes artifact-related summary portal data
- tracks artifact types and per-portal artifact relevance
- injects artifact portal entities back into the main render path
- keeps artifact-relevant portals alive during cleanup
- renders a dedicated artifact marker layer
- provides a dedicated artifact list UI

Portal details also show artifact summary/detail in [portal_detail_display.js](../../ingress-intel-total-conversion/core/code/portal_detail_display.js:270).

### 5. Ornaments are a dedicated subsystem
Ornaments are also first-class in IITC, via [ornaments.js](../../ingress-intel-total-conversion/core/code/ornaments.js:1).

What IITC does:

- treats ornaments as image overlays attached to portal markers
- keeps separate layers for `Ornaments` and `Excluded ornaments`
- persists excluded and known ornament ids in localStorage
- allows prefix-based exclusion rules
- allows plugins to supply icon/name definitions

The local IITC plugin [ornament-icons.js](../../ingress-intel-total-conversion/plugins/ornament-icons.js:25) also documents known ornament ids, including:

- `sc5_p` = volatile scouting portal
- `bb_s` = scheduled Rare Battle Beacons

### 6. Highlighters are globally exclusive
IITC’s highlighter model in [portal_highlighter.js](../../ingress-intel-total-conversion/core/code/portal_highlighter.js:1) is explicit:

- one global current highlighter
- one dropdown control
- optional `setSelected` lifecycle
- changing the highlighter resets all portal styles

Plugins contribute highlighters, but they do not run concurrently as independent map overlays.

## IRIS Runtime Model

### 1. Core data ownership is store-first
IRIS uses a normalized Zustand store in [packages/core/src/store.ts](../../packages/core/src/store.ts:1).

Compared to IITC:

- entities are stored as plain records, not long-lived marker objects
- map render is rebuilt from store state in [MapOverlay.tsx](../../packages/extension/src/ui/domains/map/MapOverlay.tsx:1)
- passive interception and active fetches are separated
- auxiliary request policy is coordinated in [request-coordinator.ts](../../packages/extension/src/content/runtime/request-coordinator.ts)

### 2. Core entity refresh is less IRIS-owned than IITC
IITC directly owns entity refresh. IRIS mostly piggybacks Intel for core map entities and only actively owns selected auxiliary endpoints.

That means:

- IRIS is less invasive
- but IRIS has fewer first-class refresh/culling policies for core entities than IITC
- some IITC-specific guarantees, such as render-path injection and artifact-interest preservation, do not exist as dedicated systems in IRIS yet

### 3. Artifacts and ornaments are currently lighter-weight in IRIS
IRIS now supports both:

- artifacts via [artifacts/parser.ts](../../packages/extension/src/content/domains/artifacts/parser.ts:1) and artifact rendering in [feature-builders.ts](../../packages/extension/src/ui/domains/map/feature-builders.ts:119)
- ornaments via entity parsing in [entities/parser.ts](../../packages/extension/src/content/domains/entities/parser.ts:1) and ornament overlay building in [feature-builders.ts](../../packages/extension/src/ui/domains/map/feature-builders.ts:173)

But compared to IITC:

- artifacts are not injected into entity render ownership
- ornaments are not image/icon overlays with exclusion rules
- there is no ornament registry or user-managed excluded-known ornament model
- portal details now show ornaments, but there is no IITC-style ornament options workflow

### 4. Plugin overlays are more generic than IITC
IRIS currently routes plugin visual output through a generic plugin-feature collection in [PluginManager.ts](../../packages/core/src/PluginManager.ts:1).

That is flexible, but it also means:

- player tracker, labels, fills, and other plugin overlays all share one general map-feature path
- HTML marker plugins are still somewhat special-cased in `MapOverlay`
- highlighter-style behavior is not modeled separately from ordinary plugin overlays

This is more general than IITC, but also less opinionated.

## What IRIS Can Learn From IITC

### 1. First-class overlay subsystems can be worth it
Artifacts and ornaments in IITC are not generic plugin overlays. They have dedicated behavior because they have dedicated semantics.

For IRIS, this suggests:

- artifacts may deserve a more deliberate subsystem if artifact behavior grows
- ornaments may deserve a small registry model rather than only raw portal metadata

### 2. “Richer data arrives later” should stay explicit
IITC’s portal-marker merge logic is careful about:

- placeholder-to-real upgrades
- equal-timestamp enrichment
- history merge behavior

IRIS already merges portal records, but IITC is a reminder that enrichment rules should stay intentional and documented.

### 3. Global highlighter behavior in IITC is real, not incidental
IITC clearly models highlighters as one selected style function at a time.

That does not mean IRIS must copy it, but it does mean the current IRIS overlay-plugin model is a product choice, not parity.

### 4. Ornament handling in IITC is richer than just “portal has ornaments”
IITC has:

- known ornament ids
- display names
- exclusion rules
- separate layers
- image/icon support

IRIS now has:

- parsed ornament ids
- filter toggle
- portal detail labels
- debug mocks

That is a good baseline, but still materially lighter than IITC.

## Current IRIS Advantages

IRIS is ahead of IITC in some areas of implementation shape:

- typed domain modules
- clearer content/runtime/store separation
- simpler plugin manifest lifecycle
- modern UI composition
- easier targeted mocking and debug instrumentation

So this is not “IITC is better.” It is mostly “IITC has more specialized runtime behavior where the domain needed it.”

## Concrete Follow-Ups Suggested By This Comparison

### High-value

- keep artifacts and ornaments separate in both UI and runtime ownership
- continue growing the local ornament registry from verified IITC-known ids
- decide explicitly whether IRIS wants IITC-style single highlighters or concurrent overlay plugins

### Medium-value

- consider a first-class plugin marker/overlay registry instead of routing all plugin visuals through one generic feature collection
- review whether artifact-relevant portals should receive any special treatment in map cleanup or selection behavior
- document portal enrichment/merge policy more explicitly, using IITC’s equal-timestamp enrichment logic as a reference point

### Lower-value

- artifact list UI comparable to IITC
- ornament exclusion/known-id preferences comparable to IITC
- icon-based ornament rendering instead of generic rings

## Bottom Line
The IITC repo confirms that several behaviors we were treating as “possible references” are actually core design choices:

- artifacts are their own runtime subsystem
- ornaments are their own runtime subsystem
- highlighters are globally exclusive
- map data refresh is scheduler-owned and render-aware

IRIS does not need to copy those choices exactly. But if IRIS wants closer IITC parity in these areas, the path is not “more generic plugin features.” The path is likely “slightly more first-class domain subsystems.”
