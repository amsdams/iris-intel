# COMM, Player Tracker And Map Freshness Investigation

Investigated 2026-11-04 at source checkpoint `556bc58`, following the user's report that a player marker moved to a
captured portal while the portal retained its previous faction. The original observations below describe that
checkpoint. The user subsequently authorized the fixes, now implemented in the working tree; see the completion note.

## Implementation Completion

All three findings now have production fixes and browser regressions in `tests/browser/comm-freshness.smoke.mjs`.
Map refresh follows the reference's 5/15-minute minimum and twice-duration backoff, with same-tile refresh enabled,
movement/auth/disposal guards and idle/resume. Public/faction area changes reset buffers/cursors with the 10% bounds
tolerance; late old-area replies cannot repopulate them. A single COMM owner polls interested channels and publishes
shared public updates to both the visible panel and tracker. Poll cadence follows the reference's 30-second base,
5 seconds per zoom step below 18, and 10-second override minimum, replacing IRIS's separate 120-second tracker timer.
An additive `IITC_IRIS_COMM_VISIBILITY` message carries panel interest across navigation and map replacement; existing
request/status formats and storage keys remain. Hidden pages suspend immediately (an explicit divergence from IITC's
short grace period); visible pages become idle after 15 minutes without input and map resume waits 5 seconds.

Browser coverage also protects scroll position, hidden-panel cancellation, active faction/alerts polling and
visibility resume. Unit tests cover in-flight sharing, old-area/map rejection, channel isolation, older-history
requests, auth pause and late send completion. Live Intel comparison and Android/Firefox smoke remain pending.
`npm run check` passes (677 app/core tests plus six release gates), as do all 56 Chrome cases, extension packaging,
and signed Android release tests/lint/build. All 22 shared assets match APK/XPI/ZIP, and the APK certificate matches
the public pin. XPI/ZIP: `2026-11-04T14-42-10`; APK `0.4.1-alpha+556bc58` (1858), including uncommitted changes.

## Conclusion

The symptom is reproducible. Player Tracker consumes COMM activity; portals, links and fields consume authoritative
`getEntities` map tiles. COMM does not directly mutate those map entities in either IRIS or the reviewed IITC-CE core.
The material divergence was that IRIS had no recurring map-data refresh for a stationary viewport. COMM/tracker data
could advance while map entities stayed stale indefinitely. Two additional COMM synchronization defects were reproduced.

## Ownership And Reference Comparison

| Concern | IRIS at the investigated checkpoint | Local IITC-CE reference |
| --- | --- | --- |
| Public COMM to player positions | `comm/comm-runtime.ts` shares its public buffer with `map/player-tracker/player-tracker-runtime.ts`; tracker polls every 120 seconds while enabled and visible at zoom 9+. Public panel refreshes also feed the tracker. | `core/code/comm.js` publishes `publicChatDataAvailable`; `plugins/player-activity-tracker.js` derives last-action locations from those messages. |
| Portal/link/field state | `map/map-request.ts` fetches `getEntities`; `map/entities/map-renderer.ts` synchronizes the decoded layers. No COMM-to-entity mutation path exists. | `core/code/map_request.js` owns authoritative map refreshes, independently of the tracker hook. |
| Stationary map refresh | Requests are scheduled by movement/settings/request messages. Successful completion schedules no future map refresh. | `Request.prototype.processRenderQueue` schedules another refresh: minimum 300 seconds at zoom >12, 900 seconds otherwise, or twice the fetch duration if longer. Idle pauses and resume have explicit handling. |
| Cache freshness | `packages/iitc-core/src/data-cache.ts` considers tiles fresh for 180 seconds. Expiry is checked when a refresh is invoked; it does not trigger one. | The map request timer eventually re-enters tile/cache processing without requiring movement. |
| COMM area changes | `getCurrentCommBounds` changes request bounds but retains channel buffers and continuation timestamps/GUIDs. | `comm.js:_genPostData` resets local-bounds channels when old/new bounds differ beyond a 10% tolerance. Public and faction channels are local; alerts are not. |
| Background COMM publication | `applyPlayerTrackerCommResponse` updates the shared buffer, but does not update/publish `latestCommState`. The panel has an initial idle request and explicit refresh actions, with no recurring panel refresh. | `_handleChannel` writes the channel buffer, publishes hooks and renders the corresponding channel; interested channels are refreshed by the shared request scheduler. |

Tracker positions are last known action locations, not GPS positions. Like the reference, IRIS ignores destruction
messages whose portal does not establish the acting player's location. A marker moving after new activity is expected.

## Reproduction

The saved probe uses the compiled app, real page-runtime requests and real Leaflet layers in headless Chrome at
412 × 780. All endpoints are simulated; no credentials, live Intel requests or outgoing COMM messages are used.
Playwright advances timers, with a matching advanceable clock for the tile cache's captured `Date.now` callback.
Fast-forwarding fires due timers without simulating every intervening polling cycle; the elapsed times below are
simulated, not a claim of a real-device soak test or a live server's response latency.

```sh
npm run build -w apps/iitc-iris
node tests/browser/server.mjs
```

In another terminal:

```sh
node tests/browser/investigate-comm-map.mjs
```

The probe prints JSON snapshots. Initial and final authoritative map states are asserted so missing layers or an
empty fixture cannot masquerade as the reported problem. Current observed defects are reported rather than made
permanent expected behavior in the regular regression suite.

### 1. Missing stationary map refresh — confirmed, highest priority

Initial tiles contain a green portal and its old link/field. The simulated server then has a blue portal and no old
link/field; a new Resistance capture message arrives through the tracker poll.

| Step | Map HTTP requests | Player location | Portal | Old link/field |
| --- | --- | --- | --- | --- |
| Initial map | 3 | Previous portal | Green | Present |
| Tracker poll after about 2 minutes | 3 | Captured portal | Green | Present |
| Movement while cached tiles are fresh | 3 | Captured portal | Green | Present |
| Another 16 stationary simulated minutes | 3 | Captured portal | Green | Present |
| Movement after cache expiry | 6 | Captured portal | Blue | Removed |

The final update proves the decoder/renderer applies the changed faction and removes obsolete links/fields when
fresh authoritative tiles arrive. No renderer failure was observed in this scenario. A quick pan within the cache
freshness window does not guarantee a network fetch. This explains the reported kind of mismatch, but does not
prove the timing or server responses in the user's particular live observation.

`refreshEntities` also returns early when `latestRequestKey` is unchanged. A periodic fix must deliberately allow a
new refresh of the same tiles; adding a timer around the existing call alone would still hit that guard.

### 2. Old-area COMM cursor excludes new-area activity — confirmed

After loading public COMM in area A, the probe moves to area B. The next request uses B's coordinates but keeps A's
`minTimestampMs` and `plextContinuationGuid`. A valid B event 60 seconds older than A's newest event is excluded by
that request. Its agent never enters tracker history. The old area's messages also remain in the shared channel.
The timestamp/bounds defect applies to both public and faction request construction; the saved browser probe
exercises public COMM. This is independent of map entity freshness.

### 3. Background tracker responses leave published COMM state stale — confirmed

The initial public panel state contains `activity-0`. The background tracker fetch receives `activity-1` and moves
the marker, but no updated COMM status is published: the last panel state still contains only `activity-0`.
An explicit public COMM refresh immediately publishes both buffered messages. This is a shared-buffer/publication
gap; the response is not lost from the buffer. Faction/alerts have no independent recurring refresh either.

No page errors occurred during the combined probe. Android, Firefox, real-provider ordering, and actual live
capture/destruction timing were not tested.

## Recommended Implementation Order

1. Restore a map-lifetime-owned periodic authoritative refresh, using the reference's bounded cadence as the
   starting point. Handle same-tile refresh identity, movement/in-flight coordination, auth failures, hidden/idle
   behavior, resume, retry timing and disposal. Keep the existing cache and avoid fetching per COMM message.
2. Bind local COMM buffers/cursors to their request area, including tolerance for minor movement. Reset public and
   faction state on material area changes; reject late old-area responses and preserve independent tracker history.
3. Coordinate panel and tracker polling/publication so visible COMM receives shared public updates and active
   faction/alerts channels refresh. Avoid duplicate requests and preserve scroll/history/send/cancellation behavior.

Do not reconstruct current portal/link/field state by replaying COMM: messages can be historical, delayed, missing
or outside the visible area, and do not carry a complete authoritative entity snapshot. An optional future
COMM-driven tile invalidation would need event-time checks, bounded/coalesced requests and its own comparison.
