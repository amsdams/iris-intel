# Portal Analysis Views

Goal: smart-port IITC's viewport portal analysis workflows into native IITC IRIS sheets while preserving IITC names and
comparison points.

IITC-CE source references:

- `reference/ingress-intel-total-conversion/plugins/portal-counts.js`
- `reference/ingress-intel-total-conversion/plugins/portals-list.js`
- `reference/ingress-intel-total-conversion/plugins/scoreboard.js`
- `reference/ingress-intel-total-conversion/plugins/keys-on-map.js` for key-count integration in portal rows.
- `reference/ingress-intel-total-conversion/plugins/highlight-portal-history.js` for visited/captured/scout-controlled
  history concepts shown in portal rows.

Ported IITC concepts:

- `portalcounts`: visible-viewport portal totals by team and level, plus history, mission, ornament, artifact, key, and
  placeholder counts.
- `portalslist`: visible-viewport portal rows with title, level, team, health, resonator count, links, fields, AP,
  keys, history, scout, and mission flags.
- `scoreboard`: visible-viewport faction metrics for Enlightened, Resistance, and Machina.
- IITC AP constants from the portals-list plugin are kept in `packages/iitc-core/src/portal-analysis.ts` so AP math is
  testable outside the browser runtime.

Current status:

- `packages/iitc-core/src/portal-analysis.ts` is the IITC-named facade for counts, list, scoreboard, bounds filtering,
  and portals-list AP calculations.
- IITC IRIS runtime posts `portalAnalysis` with each entity status message, using the current viewport bounds and
  inventory key counts when available.
- UI access is native to the IITC IRIS shell: `Map -> Counts`, `Map -> List`, and `Map -> Scoreboard`.
- The List sheet supports sortable IITC-style columns and portal navigation via the existing `zoomToAndShowPortal`
  selection path.
- Visual parity pass adds faction-colored columns/cells across Counts, List, and Scoreboard.
- Counts now includes native SVG level bars and an IITC-style two-layer pie: filled faction share in the body and level
  share in the outer ring, keeping the numeric table as the source of truth for comparison.
- List now includes name, faction, and level filters plus summary chips for filtered portals, links, fields, AP, and
  keys.

Intentional divergences:

- IITC IRIS uses bottom sheets instead of IITC's sidebar/dialog/toolbox placement. The sheet names and data concepts stay
  IITC-aligned so live comparison remains cheap.
- Counts are marked approximate when the current `getEntities` plan is at link-level zoom and real portal payloads are
  not requested.
- The first pass does not implement every portals-list addon column or export action. It focuses on counts, list,
  filtering, and scoreboard parity that can be compared directly against IITC.

Validation:

- `npm run test:iitc-core -- --run src/portal-analysis.test.ts`
- `npm run lint:iitc-iris`
- `npm run typecheck:iitc-iris`
- `npm run package:iitc-iris` after code changes.
