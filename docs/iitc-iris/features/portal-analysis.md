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
- `scoreboard`: visible-viewport faction metrics for Resistance, Enlightened, and Machina.
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
- Counts keeps IITC's table-first flow, with the graph below the numeric counts table and summary chips.
- Counts now includes native SVG bars and an IITC-style two-layer pie. The bars follow IITC's `All` plus player-faction
  vertical bars stacked by level color; the pie has filled faction share in the body and level share in the outer ring,
  keeping the numeric table as the source of truth for comparison. Neutral remains in the pie/table but does not get a
  dedicated bar because it is always level 0.
- The Counts graph uses IITC's original chart measurements: 25px bars, 5px bar padding, 180px bar height, 70px inner pie
  radius, 100px outer pie radius, and one shared SVG coordinate system so the bars and pie keep IITC proportions.
- Counts chart L0/placeholder segments use IITC black in the SVG level ring and `All` bar.
- Neutral portals are counted as level 0 in Counts even after full portal entities replace placeholder records, matching
  IITC's uncaptured-portal chart behavior.
- Counts, List, and Scoreboard use the brighter IITC team and level colors in their analysis tables, pills, and faction
  columns rather than the softer default IITC IRIS portal-panel colors.
- Counts, List, and Scoreboard intentionally order player factions as Resistance, Enlightened, and Machina to match the
  active IITC IRIS comparison preference.
- List includes an IITC-style filtered summary grid for faction totals and history totals with percentages, using the
  same value-first card hierarchy as the Counts summary grid. The native
  table omits IITC's row-number column as an intentional sheet-density improvement, left-aligns portal names, normalizes
  neutral portals to L0, and includes a reset action for filters.
- List now includes name, faction, and level filters plus summary chips for filtered portals, links, fields, AP, and
  keys.
- Live IITC comparison on 2026-06-10 found Counts, List, and Scoreboard acceptable for this stable v1 checkpoint.

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
- Manual live comparison against IITC's `portal-counts`, `portals-list`, and `scoreboard` plugins.
