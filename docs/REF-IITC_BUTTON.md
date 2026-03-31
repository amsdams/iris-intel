# Reference: IITC-Button Core Implementation Analysis

This document compares the non-plugin parts of `reference/IITC-Button` with the current IRIS implementation. The goal is not to replicate IITC-Button, but to identify extension/runtime ideas that can improve IRIS core behavior.

Scope:
- Included: extension runtime, background/content architecture, injection, bridging, Intel tab lifecycle, storage/network plumbing
- Excluded for now: IITC community plugins and feature plugins

---

## What IITC-Button Actually Is

`reference/IITC-Button` is not a clean-room reimplementation of Intel like IRIS. It is an extension wrapper and distribution/runtime system for IITC itself.

At a high level it provides:
- a background/runtime layer that manages Intel tabs and IITC injection
- content-script bridges for XHR and storage access
- browser compatibility handling for Chrome, Firefox, and Safari paths
- extension UI for enabling/disabling IITC and managing packages

That means the comparison is mostly about extension architecture, not about map/entity rendering.

---

## Architectural Comparison

### 1. Injection Model

**IITC-Button**
- Treats Intel page integration as a managed injection problem.
- Tracks Intel tabs in background code and injects/reloads IITC when appropriate.
- Keeps explicit open/toggle flows in [`background/intel.js`](/Users/jula/ittca/reference/IITC-Button/src/background/intel.js).

**IRIS**
- Uses a simpler MV3 extension shape.
- The background script is currently minimal in [`background/index.ts`](/Users/jula/ittca/packages/extension/src/background/index.ts).
- Most behavior lives in the injected page interceptor and the content script:
  - [`content/interceptor.ts`](/Users/jula/ittca/packages/extension/src/content/interceptor.ts)
  - [`content/index.ts`](/Users/jula/ittca/packages/extension/src/content/index.ts)

**Assessment**
- IRIS is leaner and easier to reason about.
- IITC-Button is stronger at explicit tab/session lifecycle management.

### 2. Bridge Separation

**IITC-Button**
- Has a dedicated bridge dispatcher in [`bridge-manager.js`](/Users/jula/ittca/reference/IITC-Button/src/content-scripts/bridge-manager.js).
- Splits responsibilities into:
  - XHR bridge
  - storage bridge
  - fallback runtime message handling
- Uses custom events (`bridgeRequest` / `bridgeResponse`) as a structured page-content boundary.

**IRIS**
- Uses `window.postMessage(...)` heavily between the injected interceptor and the content script.
- The contract is currently spread across:
  - [`content/interceptor.ts`](/Users/jula/ittca/packages/extension/src/content/interceptor.ts)
  - [`content/index.ts`](/Users/jula/ittca/packages/extension/src/content/index.ts)
  - [`content/runtime/message-types.ts`](/Users/jula/ittca/packages/extension/src/content/runtime/message-types.ts)

**Assessment**
- IRIS has already improved compared with its original monolithic content script, but its bridge protocol is still more ad hoc than IITC-Button’s.
- IITC-Button has a clearer transport boundary.

### 3. Network Access Strategy

**IITC-Button**
- Uses a dedicated XHR bridge in [`xhr-bridge.js`](/Users/jula/ittca/reference/IITC-Button/src/content-scripts/xhr-bridge.js).
- For most browsers it uses a hidden sandbox iframe for privileged XHR.
- For Safari it falls back to runtime messaging.
- Includes retries and delayed initialization when the bridge is not ready.

**IRIS**
- Patches page-world `XMLHttpRequest` and `fetch` directly in [`content/interceptor.ts`](/Users/jula/ittca/packages/extension/src/content/interceptor.ts).
- Intercepts Intel responses in place, then forwards normalized events back to the content script.
- Also issues IRIS-triggered requests from the page world so Intel accepts them with the correct session/version context.

**Assessment**
- IRIS’s approach is better aligned with its goal: it wants Intel’s own traffic and state, not a separate request runtime.
- IITC-Button is more defensive about bridge readiness and browser-specific fallback behavior.
- IRIS does not need the iframe model, but it could adopt some of the readiness/fallback discipline.

### 4. Extension Runtime Ownership

**IITC-Button**
- Background/runtime logic is substantial.
- Maintains enable/disable state, tab targeting, Intel open/focus behavior, and install/update flows.

**IRIS**
- Owns app state strongly in the page/content layer via Zustand and domain handlers.
- Background runtime is currently intentionally minimal.

**Assessment**
- This is an architectural tradeoff, not a weakness by itself.
- But IRIS currently lacks some extension-level coordination that IITC-Button handles explicitly.

### 5. UI Ownership

**IITC-Button**
- Its extension popup is a management UI for IITC packages and runtime behavior.
- It is not trying to replace Intel’s in-page UI with its own data model.

**IRIS**
- Owns the in-page overlay, rendering, and UI directly.
- This is a stronger long-term architecture for a true Intel replacement.

**Assessment**
- IRIS should not try to copy IITC-Button’s popup architecture wholesale.
- The useful lessons are in runtime plumbing, not in UI structure.

---

## Where IRIS Is Already Better

IRIS is stronger than IITC-Button in the areas that matter for a clean replacement client:

- Fully owned TypeScript codebase instead of wrapping legacy IITC globals
- Central Zustand state and normalized domain handling
- Domain-oriented content modules:
  - `entities`
  - `portal-details`
  - `plexts`
  - `game-score`
  - `region-score`
  - `inventory`
  - `player`
- Domain-oriented UI structure and MapLibre rendering
- First-class plugin API designed for IRIS rather than inherited IITC script injection

So the right conclusion is not “be more like IITC-Button everywhere”. It is “borrow its runtime discipline where IRIS is still thin”.

---

## Improvement Opportunities For IRIS Core

### 1. Strengthen the Extension Runtime Layer

IITC-Button has much more explicit runtime ownership around Intel tabs and enable/disable state.

IRIS could improve by adding:
- a real background coordinator instead of the current stub in [`background/index.ts`](/Users/jula/ittca/packages/extension/src/background/index.ts)
- explicit “open Intel / focus Intel tab / detect active Intel tab” flows
- tab lifecycle tracking so reinjection/recovery behavior is deliberate instead of incidental

This is one of the highest-value takeaways.

### 2. Formalize the Bridge Protocol

IRIS already has message types, but transport is still spread across ad hoc `postMessage` flows.

IRIS could improve by introducing:
- one shared bridge dispatcher for page-to-content traffic
- one shared bridge dispatcher for content-to-background traffic
- clearer request/response correlation for commands that expect results
- tighter ownership of message names and payload shapes

This would make debugging easier and reduce accidental protocol drift.

### 3. Separate Transport Concerns More Explicitly

IRIS has improved content architecture, but the interceptor still mixes:
- request triggering
- Intel version capture
- map synchronization
- network interception
- request status logging
- session-adjacent behavior

IITC-Button’s split between bridge manager, storage bridge, and XHR bridge suggests a useful next step:
- keep one interceptor runtime
- but split transport concerns into smaller, purpose-specific modules

For example:
- network bridge/runtime
- map bridge/runtime
- player/session bridge/runtime
- storage/preferences bridge

### 4. Add Session Failure and Recovery Handling

IITC-Button is more operationally aware of browser/runtime state. IRIS still lacks a formal session-loss story.

IRIS should add:
- explicit handling for Intel `401` / `403`
- CSRF/session invalidation detection
- a user-visible “session expired / reload Intel” state
- controlled reload/recovery behavior

This would improve reliability more than most UI work.

### 5. Add a Real Storage Boundary

IITC-Button has a dedicated storage bridge. IRIS mostly relies on local app state and extension persistence without a distinct boundary.

IRIS could improve by centralizing:
- settings persistence
- plugin enablement/config persistence
- import/export of settings
- backup/restore of IRIS preferences

This does not need IITC-Button’s exact model, but it would benefit from the same explicitness.

### 6. Improve Browser/Runtime Compatibility Strategy

IITC-Button has deliberate browser-path branching, including Safari-specific fallback.

IRIS does not need to chase every browser path immediately, but it would benefit from:
- clearer isolation of browser-specific extension APIs
- a compatibility layer around scripting/injection/runtime differences
- less assumption that one injection path is always available

This matters if IRIS wants to stay reliable across Chrome and Firefox, and later Safari.

---

## What IRIS Should Not Copy

Some IITC-Button patterns are not a good fit for IRIS:

- Reintroducing a large wrapper architecture around IITC globals
- Replacing IRIS’s typed domain handlers with generic userscript-style bridges
- Moving core app behavior into the extension popup
- Treating the project primarily as a script/package manager instead of a real client

IRIS’s current direction is better. The improvements should be additive around runtime quality, not a rollback in architecture.

---

## Practical Next Steps

If the goal is to improve IRIS core implementation based on IITC-Button, the best low-risk sequence is:

1. Build a real background coordinator for Intel tab lifecycle and extension state.
2. Centralize the page/content bridge into one explicit dispatcher module.
3. Add session-expiry and recovery handling.
4. Introduce a storage/preferences service boundary.
5. Add a small compatibility layer for browser-specific extension APIs.

These would improve the operational quality of IRIS without compromising the current domain-oriented architecture.

---

## Comparison Summary

| Area | IITC-Button | IRIS | What To Learn |
| :--- | :--- | :--- | :--- |
| **Overall Goal** | Extension wrapper for IITC | First-class Intel replacement client | Different products; do not copy wholesale |
| **Background Runtime** | Strong tab/injection management | Minimal background script | IRIS should strengthen extension/runtime coordination |
| **Page/Content Bridge** | Explicit bridge manager + sub-bridges | `postMessage`-driven and more distributed | IRIS should formalize bridge transport |
| **Network Strategy** | XHR bridge via sandbox iframe/fallback | Page-world XHR/fetch interception | IRIS approach is correct, but bridge readiness/recovery can improve |
| **Storage Boundary** | Dedicated storage bridge | More implicit app persistence | IRIS should centralize settings/import-export handling |
| **Browser Compatibility** | Explicit compatibility branches | Simpler current path | IRIS should isolate browser-specific extension behavior |
| **In-Page UI/Data Model** | Largely inherited from IITC | Fully owned TS/Preact/MapLibre UI | IRIS is already better here |
| **Architecture Direction** | Manager/wrapper around existing client | Domain-oriented clean-room implementation | Keep IRIS architecture; borrow runtime discipline only |
