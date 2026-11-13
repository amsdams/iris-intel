# Missing IITC core features

Authorized 2026-11-13 on `feat/missing-core-features`, after destinations commit `66017f2` was fast-forward merged
into local main. No remote push. Implement all five requested features; downloadable builds are request-only.

| Feature | Reference and behavior | Owner |
| --- | --- | --- |
| Prime portal link | `core/code/portal_display.js`, `makePrimeLink`: copy `https://link.ingress.com/portal/{guid}` | Portal sharing UI, existing clipboard feedback |
| Portal range circles | `portal_display.js`, `setIndicators`: 40m access circle; geodesic link range, dashed until eight resonators; clear on deselect/replacement | Selection/map lifetime; pure range calculation in core |
| Portal statistics | `portal.js`, `portal_display_tools.js`: range/amps, energy, outgoing capacity, AP breakdown, hacks/cooldown/burnout, attack modifiers | Core formulas; portal Facts UI |
| Regional scoreboard | `region_scoreboard.js`: 35 five-hour checkpoints, epoch-aligned cycles, history/graph, lower-median projections, timers, all top agents | Core parsing/calculations; scores request owner and UI |
| QR sharing | `portal_display_tools.js`, `posLinksTemplate`: locally encoded `GEO:lat,lng` | Portal sharing UI; local QR encoder |

Preserve existing contracts additively, account for unknown player level/team, incomplete map topology, neutral and
Machina portals, stale/malformed responses and selection changes. QR codes must never send locations to an external
image service. Keep counts/estimates distinguished from server-provided scores. Match IITC behavior while retaining
IRIS sheets and RES/ENL ordering. Record any further intentional divergences with evidence here.

Validation: reference-comparison formula tests; QR decode round-trip; selection/range lifetime tests; score parsing,
cycle boundaries and projections; browser checks for all five features, narrow layouts, chart/table and cleanup.
Finish with repository checks and the full browser suite. No XPI/APK packaging unless requested.

## Implementation checkpoint — 2026-11-13

All five features are implemented, uncommitted on this branch:

- Map links contains **Copy Prime link**, using IITC's scanner URL and the existing clipboard feedback owner.
  **QR code** reveals a locally generated SVG for `GEO:lat,lng`, with a four-module quiet zone. Selection changes
  reset the disclosure. `qrcode-generator` is the app's only new runtime dependency; its MIT notice is available
  offline under About and copied into web assets. `jsqr` is test-only and checks the encoder's output by decoding it.
- Selection owns the 40m access circle and the red geodesic link-range polygon. The latter is drawn only from
  matching ready details and uses IITC's earth radius, minimum 48 segments and radius/1000 sampling. Incomplete
  portals have dashed range indicators. Clicking the range in Facts fits its bounds. Existing selection-layer
  cleanup clears both circles on deselection, filtering and map replacement.
- `packages/iitc-core/src/portal-statistics.ts` owns link range, fractional resonator level, diminishing mod effects,
  aggregate energy, outgoing-link capacity, friendly upgrades/AP, enemy attack/capture AP, hacks/cooldown/burnout
  and turret/force-amp modifiers. Facts displays these calculations and marks topology-dependent AP as based on
  loaded data. Missing player team gives both faction cooldown possibilities; unknown player level/identity does
  not invent friendly upgrade AP. Stats are derived from current selection/topology when publishing, not frozen
  into the detail cache. Machina's next-level range table is preserved.
- `packages/iitc-core/src/region-scoreboard.ts` parses/validates all checkpoint and agent data, sorts/deduplicates
  checkpoints, preserves epoch-aligned response cycle timing, and computes lower-median projections. Scores now
  exposes the full history table/totals, linear/log chart with solid checkpoint and dashed average/projected lines,
  next-checkpoint/cycle times, countdown, cycle projection and the complete top-agent list.

Intentional differences from IITC: the existing IRIS sheets and RES/ENL ordering remain. Charts and tables resize
to the panel; checkpoint times include local dates. Invalid checkpoint rows are skipped rather than breaking the
chart. Omitted checkpoints are never represented as actual zero scores. Estimates and timing remain tied to the
received cycle, with a Refresh hint for expired data. Per-app navigation behavior remains the destinations feature's
documented limitation. No external QR image endpoint is contacted.

During this work, Scores cancellation was corrected: cancelling restores the prior ready/idle state, preventing
the panel from remaining loading on reopen. Late ordinary errors from cancelled/superseded requests cannot overwrite
the new state. Portal details now also reject late failures from cancelled/obsolete selections.

Validation passes `npm run check`: 754 app/core tests (149 core, 605 app), release/build/architecture gates,
lint/types, CSS and workbench. A differential test executes checked-in IITC `portal.js` and compares range, energy,
outgoing capacity, AP, hacks and attack modifiers across 36 combinations of faction, player level and resonator count.
QR round-trips decode three coordinate payloads using an independent decoder. All 75 browser cases pass, including
five added cases for Prime clipboard data, local QR content/selection reset, portal stats/ranges, dashed incomplete
range, map replacement/cleanup and full regional scoring in light/dark themes at 320px and desktop widths.
Whitespace checks pass. Existing map-selection regressions now account for the access indicator as well as the
selection marker; no timing threshold was relaxed.

Live Intel score/portal comparison, scanner-link use in Prime, phone camera scanning and Android acceptance of the
new features remain pending. This is implementation/automated validation completion, not live acceptance.
No XPI/ZIP/APK was packaged, no remote push was performed, and the new feature work has not been committed or merged.

The subsequent user-authorized [dependency and smoke review](dependency-smoke-review.md) records the refreshed
dependency tree, split feature suites, follow-up coverage and final validation. Its latest checkpoint supersedes
the initial test counts above; installable artifacts still require an explicit build request.

User acceptance (2026-11-13): after testing the requested final XPI, the user reports that everything looks fine and
authorizes merging this branch into main. This is general XPI smoke acceptance; unreported Android/Prime-camera
edge cases remain unverified. The UI recommendations are a separate follow-up on a new branch.
