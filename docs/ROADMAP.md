# Project state and roadmap

**State:** friends alpha, 0.6.1 on main. User accepted general APK/XPI use on 2026-11-18.
Published builds are identified by GitHub Releases; targeted device checks remain relevant when affected behavior changes.
Done/release history lives in [CHANGELOG](../CHANGELOG.md); goals and completion criteria live in [README](../README.md).

## In progress

None selected.

## Next

**Release/LCM audit:** review permissions, native handoffs, Firefox signing, actual update routes and backup restoration
before broader delivery. Check advisories and compatibility; keep major Preact/Vite/Vitest/TypeScript/Stylelint upgrades
as separate work, including peer ranges, AGP/Gradle pairing and Leaflet's private canvas seam.

## Later

Keep the current feature set focused. Defer Draw Tools parity, mission planning and additional map analysis until
user feedback identifies a concrete need. Prioritize making existing tools easier to find and use on small screens.

Recovery and test-gap follow-ups are deferred until relevant changes or a reproducible problem justify them.

| Area | Remaining options / constraints |
| --- | --- |
| Request recovery | Probe Missions close-during-loading/reopen, then Passcode/geocoder cancellation as relevant. Inventory/Scores already have recovery regressions. Verify session expiry/logout/subscription transitions; retain preferences and pause automatic work during auth recovery. |
| Test gaps | Cover malformed/blocked saved views, overwrite/delete/eight-view limits and filtered-message reload; expand CI browser coverage when needed. Add visual baselines/workbench compositions only for a concrete benefit. |
| Menus / tracker | [Pinning/presets and separate tracker activation](iitc-iris/plans/optional-features-plan.md); independent of visibility and shared COMM polling. Nearby marker overlaps/player-level inference remain optional. |
| Saved data | Persistent bookmarks/views and richer key search/management; basic inventory/key counts exist. |
| Missions | Personal completion/waypoint checklist, distance-to-start, uniques/history and consistent First/waypoint focus. |
| Draw Tools | Polygon/circle UI, edit events/handles, Snap import cleanup, palette/options, stock `pls` and dependent APIs. |
| COMM | Live send/history comparison, measured catch-up/retention, grouped events, agent emphasis/watchlists. Existing loaded filters/views/activity are not missing features. |
| Map / planning | Distance, minimap/scale/zoom controls, privacy/KML, richer search/context actions; link direction/linked portals/tidy/fly/done workflows. |
| Analysis / styles | Additional columns/export; missing-resonator, high-level, ornament, ownership/weakness, inactive/moved, bookmark/uniques highlighters. |
| Extensibility | Public plugin/hooks/toolbox/layer/highlighter/Leaflet.draw APIs only for a concrete consumer; compare core/plugins and guard consequential bridge payloads. |

## Evidence and regression watch

- Dependencies: [picomatch ReDoS](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) has no published fix as of 2026-11-18.
  Installed copies are dev-only; reviewed tooling uses repository-controlled globs, with no app input path found. Recheck upstream;
  keep the alert open. The separate minimatch override still covers an older transitive consumer.
- Inventory: observe valid-empty/C.O.R.E./cross-device availability without inventing shared quota or cooldown rules.
- Map: investigate concrete cache/retry/overlap/idle mismatches using the [comparison runbook](../tests/browser/README.md#live-iitc-comparison).
  Live stale fallback after retry exhaustion and resonator compass orientation lack separate live acceptance.
- Events: obtain sanitized non-empty artifact/shard samples; fixtures do not establish live event parity.
- Performance: check dense key/image overlays on device; measure bridge copies, analysis publication, marker replacement,
  drawings/crossings and tracker traces before optimizing. Faction subgroup nesting previously worsened paint timing.
- Coverage/accessibility: tracker zoom-9 override and COMM coverage feedback remain deferred. Check focus, contrast,
  long content, gestures/reduced motion and Firefox native controls opportunistically; UI polish is not exhaustive acceptance.
- Cache policy audit, if selected: keys, TTLs, invalidation, persistence and stale policy across feature owners.

## Blocked / paused

Play expansion is paused by user request; an internal Play install passed user smoke. Resume only when selected,
using the [distribution checklist](iitc-iris/plans/play-store-readiness.md): supported auth, permission/access,
app-signing compatibility, privacy/deletion declarations and actual account testing requirements remain unresolved.
Saved passwords, CI AAB delivery and Play-specific update help remain open. Background monitoring/notifications and
native file import/export need separate scope; no production backend is assumed.

## History

Retired plans and feature notes are recoverable at `38520c7`, e.g.
`git show 38520c7:docs/iitc-iris/plans/index.md`. Earlier IRIS/Mini-IRIS code is available at the last pre-removal commit
`aae62a6e896ab30aa4608562af05d4e16b0614bb`. Ignored local captures are outside the maintained document set.
