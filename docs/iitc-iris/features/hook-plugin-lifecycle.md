# Hook and Plugin Lifecycle

Goal: Establish a "thin" but robust plugin infrastructure for IITC IRIS to enable internal decoupling and simplify porting external IITC plugins.

## Architecture

The system relies on three pillars:
1. **Event Bus (Hooks):** Typed `addHook` / `runHooks` for subsystem communication.
2. **Registry (Highlighters):** Dynamic registration for portal markers.
3. **Setup Sequence (Lifecycle):** Orchestrating the `setup` and `iitcLoaded` phases.

## Phase 1: Core Registries

### Hooks Module (`src/hooks.ts`)
Implement the IITC `hooks.js` pattern with TypeScript safety.
- **Contract:** Define `HookData` interface for all supported events (e.g., `portalSelected`, `mapDataRefreshEnd`).
- **Methods:** `addHook`, `removeHook`, `runHooks`.
- **Safety:** Use `try/catch` around callback execution to prevent plugin failures from crashing the core.

### Highlighter Registry (`src/highlighters.ts`)
Extract hard-coded highlighters from `content.tsx`.
- **API:** `addPortalHighlighter(name, highlighterObj)`.
- **Interface:** Highlighters must implement `highlight(portal: IitcIrisSelectedPortal): void`.
- **Migration:** Move "Level color", "Needs recharge", and "History" highlighters into this registry.

## Phase 2: Internal Decoupling

Migrate existing `content.tsx` logic to use the new infrastructure:
- **Selection:** Fire `portalSelected` hook instead of calling `setPortalDetails` directly.
- **Rendering:** Fire `portalAdded`, `linkAdded`, and `fieldAdded` during the Leaflet render loop.
- **UI:** Update the "Display" sheet to generate the highlighter list dynamically from the registry.

## Phase 3: Plugin Bridge

Enable compatibility with external IITC plugins:
- **Window API:** Attach `addHook` and `addPortalHighlighter` to the `window` object.
- **Lifecycle:** Fire `iitcLoaded` after the main `App` and all internal plugins have initialized.
- **Toolbox:** Add a minimal registry for "System" menu items.

## Phase 4: UI Refactor Integration

Once the registries are stable, split `content.tsx` by domain:
- **CommPanel:** Listen for `nicknameClicked` hooks.
- **DrawTools:** Listen for `mapDataEntityInject` to manage its own layers.
- **PortalDetails:** Re-render when the `portalDetailsUpdated` hook fires.

## IITC-CE Source References
- `reference/ingress-intel-total-conversion/core/code/hooks.js`
- `reference/ingress-intel-total-conversion/core/code/portal_highlighter.js`
- `reference/ingress-intel-total-conversion/core/code/portal_detail_display.js`
