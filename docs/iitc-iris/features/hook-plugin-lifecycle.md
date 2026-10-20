# Internal Registries And Lifecycle Facades

Native registries and a local selection facade are implemented. They support existing app behavior; broad external
IITC plugin compatibility is deferred. The component/content extraction they originally supported is complete.

| Owner under `apps/iitc-iris/src/` | Responsibility |
| --- | --- |
| `map/layers/layer-registry.ts` | Existing layer defaults, grouping, and diagnostics. |
| `map/layers/highlighter-registry.ts` | One active highlighter, labels, style callbacks, and legacy setting normalization. |
| `shell/menu-registry.ts` | Primary menus, sheet IDs, labels, shortcuts, and side-panel routing metadata. |
| `portals/portal-detail-section-registry.ts` | Mods, Resonators, and Facts section IDs, labels, and default-open state. |
| `context-action-registry.ts` | Map/link/field context targets and copy/center action metadata. |
| `portals/selection-lifecycle.ts` | Selected-object derivation and portal/context selection effects. |

Their adjacent tests protect IDs, defaults, ordering, normalization, visibility, and selection behavior. Rendering and
request-dependent decisions stay with the owning components/workflows. Portal context opens Portal details; link/field
context opens Selected details; plain map context stays in Controls.

Add another registry only for repeated metadata or a concrete lifecycle handoff. Keep it app-local unless the contract
is pure and suitable for core. Proposed rendering hooks such as `portalAdded`, `linkAdded`, `fieldAdded`, or
`mapDataRefreshEnd` are possible future seams, not implemented public compatibility promises.

Deferred:

- Broad `window.plugin.*` support or arbitrary reference-plugin ports.
- Public `window.addHook`, `window.runHooks`, `window.addPortalHighlighter`, or plugin menu/detail-section APIs.
- A general plugin setup sequence or request/status registry without a concrete consumer.

IITC-CE comparison sources:

- `reference/ingress-intel-total-conversion/core/code/hooks.js`
- `reference/ingress-intel-total-conversion/core/code/portal_highlighter.js`
- `reference/ingress-intel-total-conversion/core/code/portal_detail_display.js`

Use [Application Architecture](../architecture.md) for current composition rules and the
[port plan](../port-plan.md) for parity work. Completed per-registry checkpoint logs are available in Git history.
