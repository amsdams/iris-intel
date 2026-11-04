# COMM Review — 2026-11-04

Reviewed `37ea65e` on `feat/comm-map-freshness` after the user reported improved live behavior and requested a broader
COMM/reference comparison and feature ideas. The original review was read-only. The user subsequently authorized
all four fixes, the smaller usability gaps, saved filters and selected-portal activity; these are now implemented.
The findings below describe the reviewed baseline, not remaining defects.

## Implementation Checkpoint

- Automatic polling retains its deadline through foreground/history requests. Malformed `getPlexts` responses fail
  before changing buffers/cursors, retaining previously loaded messages.
- Each channel retains its draft in memory through failure and panel changes. Only confirmed delivery clears the
  matching text; a late success preserves newer edits. Retry remains explicit, with delivery uncertainty explained.
- Body self-mentions survive actor de-duplication. Sender click inserts a mention and focuses the composer; day
  separators/full time tooltips, HTTP(S) links, own-message/mention emphasis and unambiguous Tab completion are added.
- Collapsed Filters provides loaded-message search plus kind/action/faction/agent/portal filters, combined with AND.
  Up to eight named views and active filters persist locally under `iitc-iris:comm-views:v1`; edits save immediately.
  Unknown English activity formats remain Other. Raw public buffers still feed Player Tracker without display filters.
- Selected Portal → Portal activity shows ordered, expandable public system events involving that portal, matching
  GUID or coordinates when COMM lacks a GUID. It updates from accepted public responses, displays the latest 100
  matches with a total count and includes portal navigation. The view reads already loaded public COMM and creates
  no polling interest or history requests. Faction history and human chat are excluded; loaded coverage is explicit.
- Pure classification/filter/matching/completion/link rules live in core. COMM retains transport/buffers/send state;
  app composition owns per-channel drafts; the portal panel owns its map-lifetime-aware activity subscription.

Permanent unit and browser regressions replace the temporary defect probes. Synthetic browser coverage includes
channel isolation/late success, malformed refresh retention, saved views, tracker independence, timeline updates and
selection changes, faction exclusion, plus expanded filters in light/dark phone/landscape layouts. Live Intel sending
and Android acceptance remain user smoke checks. Bounded catch-up, retention measurements and additions 3–6 below
remain future work.

## Findings

### 1. History requests can indefinitely postpone background polling — medium

`comm-runtime.ts:requestChannel` calls `scheduleRefresh()` on every completed request; that cancels the existing
timer and starts a full new interval. At zoom 16, a faction-history request every 30 seconds keeps moving the
40-second deadline. The interested public channel feeding Player Tracker never polls while those actions continue.
After browsing stops, the next interval can run normally. Passive polling is not affected by this reproduction.

A controlled runtime probe loaded faction history, enabled public interest, and made four older-history requests
30 seconds apart. After 120 seconds there had been five faction fetches and zero public fetches. The reference's
`request_handling.js:_callOnRefreshFunctions` maintains the recurring deadline separately from individual channel
responses; ordinary older-history requests do not restart that deadline.

Recommendation: retain an automatic polling deadline independent of foreground/history completions, while keeping
in-flight request sharing, the override floor, channel interest, idle/auth and map-lifetime guards. Add a regression
that browses faction history while verifying public tracker polls continue.

### 2. Malformed success responses masquerade as empty/ready COMM — medium

`fetchComm` validates HTTP status, HTML and an explicit error string, but does not require a `result` array.
Core response parsing normalizes missing/invalid result rows to an empty list. A runtime probe returning HTTP 200
with `{"unexpected":true}` produced `status: empty`, zero messages and no error. With existing history, the
corresponding path can present old messages as a successful refresh. Reference `comm.js:_handleChannel` rejects a
missing result rather than rendering it as successful data.

Recommendation: validate the endpoint response shape before applying it. Preserve prior messages and report a
refresh error for malformed data; distinguish this from a legitimate empty array. Review send-success validation
against actual endpoint fixtures too; do not assume `{result: true}` is the only valid response without evidence.

### 3. Failed sends lose the recoverable draft — medium

`panel-actions.ts:sendCommAction` posts the send message and clears the draft immediately. A command probe confirms
the text is cleared before any response. The runtime's eventual error stores only the error, not the original
message, and there is no outbox/recovery UI. Reference `comm.js:sendChatMessage` includes the original message in
its failure prompt so the user can recover it.

Recommendation: retain an in-memory pending/failed message for explicit edit/retry, scoped to its channel. Avoid
automatic resend because a lost response does not establish whether delivery occurred. A late success must not
erase text the user has subsequently typed or switch the selected channel.

### 4. Actor de-duplication removes meaningful self-mentions — low

`comm-display.ts:getCommDisplayParts` removes every player part matching the actor, rather than only the redundant
sender/prefix. A display probe with sender `Agent` and body `Note to @Agent: remember this` removed both player
parts, leaving the body without the mentioned name. Reference rendering skips the sender and redundant initial
`PLAYER`, but renders `AT_PLAYER` entries in the body.

Recommendation: distinguish sender/prefix removal from body mentions; preserve body text and interactive mentions.

## Reference UI Gaps At Review Time

These were confirmed by source comparison, not live UI side-by-side testing:

| Topic | Reviewed IITC-CE core | Current IRIS |
| --- | --- | --- |
| Main sender interaction | Nickname click inserts `@name` and focuses the input. | The main actor is a plain span; remaining body player parts are buttons. |
| Dates | Date separators and full date/time tooltips. | Rows and summary show time only, making multi-day history ambiguous. |
| Plain-text links | Escaped text receives automatic links. | Plain text renders safely, but URLs are not interactive links. |
| Personal emphasis | Own actions and mentions have dedicated highlighting. | Alert/narrowcast styles and faction colors exist; no equivalent explicit own-player styling. |
| Name completion | Tab completion from visible names. | Clickable body names can append mentions; no equivalent completion UI. |
| Filters | Declarative filtering API and plugin extension seams. | No comparable user-facing filters/search. Native filters would be useful, but filtering itself is not new to IITC. |

Do not introduce arbitrary plugin compatibility to close these small UI gaps. Keep parsing/filtering pure in core,
feature state/actions in COMM, and rendering/focus behavior in the app. Scope an eventual UI pass around actual
phone use and preserve the existing panel layout unless deliberately changed.

## Shared Limits And Architecture Opportunities

- Busy-area catch-up: reference `comm.js:_genPostData` explicitly notes that one response per refresh can fall behind
  after idle or under heavy activity. IRIS shares this limitation. Ascending continuation avoids jumping ahead, but
  does not prove the feed is current. Bounded catch-up and an honest catching-up state would be an improvement;
  no live throughput issue was established in this review.
- Retention/render cost: IRIS retains channel buffers and republishes/maps the full selected history. Long sessions
  can grow bridge payloads and DOM work. The reference also retains history/rebuilds its visible table; this is an
  optimization candidate requiring measurement, not a newly demonstrated performance regression.
- Request ownership: preserve the new shared public stream and map-lifetime cancellation. Do not move UI scroll,
  transport or DOM work into core. Extract more composition only when the next feature needs a clear owner.
- Display filters must not discard raw public messages before Player Tracker consumes them. Filtering what the user
  sees must not silently change agent tracking or any future activity summaries.

## Candidate IRIS Additions

These extend the reviewed core UI; community plugins may provide overlapping features. They are proposals, not
claims of unique features across the IITC ecosystem.

1. **Readable saved filters:** human chat / activity, action type, faction, agent and portal. Include text search over
   loaded messages. Keep filtering client-side and explicitly show when only loaded history is searched.
2. **Selected-portal activity:** an ordered, expandable timeline beside portal selection, with capture/deploy/link
   activity and map navigation derived from loaded COMM. Reuse portal selection and parsed markup; do not label it
   complete portal history or current ownership.
3. **Follow an agent:** select an agent in COMM to filter their recent activity and emphasize their existing tracker
   marker/trace. Reuse existing tracker history; this represents last known actions, not live GPS tracking.
4. **Compact activity summaries:** captures by faction and distinct active agents in a selected time window, derived
   from loaded messages. Label the coverage and avoid claiming complete area statistics.
5. **Grouped repetitive events:** collapse a burst of deployments/destruction at one portal into an expandable row,
   preserving original messages/order for inspection and downstream tracking.
6. **Watchlists:** highlight chosen agents/portals in the open app, with an unread indicator. Background notifications
   would be a separate Android capability decision; current hidden-page polling deliberately pauses.

Recommended order: fix findings 1–4, add sender/date/link usability, then implement saved filters and a selected-portal
timeline as the first larger feature pass. Bounded catch-up and rendering/retention work should follow measurements.

## Evidence And Scope

Four temporary Vitest probes confirmed the runtime/command/display findings above. They passed as observations of
the defects and were removed afterward, rather than retained as tests requiring broken behavior. The implementation
checkpoint records the subsequent authorized fixes and permanent regressions. No live messages were sent.
Live device observation and a full community-plugin feature survey were outside this review.

Reference sources: `core/code/comm.js`, `chat.js`, `comm_declarative_message_filter.js`, `request_handling.js`, and
`plugins/player-activity-tracker.js` under `reference/ingress-intel-total-conversion`.
