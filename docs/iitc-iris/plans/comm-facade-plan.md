# COMM Facade Plan

Status: implemented and validated. This is Phase 1, step 1 from [index.md](index.md).

## IITC Sources

- `reference/ingress-intel-total-conversion/core/code/comm.js`
  - `IITC.comm.parseMsgData`
  - `IITC.comm._genPostData`
  - `IITC.comm._writeDataToHash`
  - `getPlexts` request handling
  - `commDataAvailable`, `publicChatDataAvailable`, `factionChatDataAvailable`, `alertsChatDataAvailable` hook calls
- `reference/ingress-intel-total-conversion/core/code/chat.js`
  - legacy `window.chat` proxy names for `genPostData`, `parseMsgData`, and `writeDataToHash`
  - `chat.chooseTab`
  - `chat.backgroundChannelData`
- `reference/ingress-intel-total-conversion/core/code/hooks.js`
  - COMM hook names and plugin-visible timing notes
- Plugin consumers for comparison only:
  - `reference/ingress-intel-total-conversion/plugins/player-activity-tracker.js`
  - `reference/ingress-intel-total-conversion/plugins/machina-tracker.js`

## Current IRIS Sources

- `packages/iitc-core/src/comm.ts`
  - `parseMsgData`
  - `parseIitcCommResponse`
  - `createIitcCommChannelData`
  - `writeIitcCommDataToHash`
  - `getIitcCommChannelMessages`
  - `genIitcCommPostData`
  - `genIitcCommSendPlextPostData`
  - `renderIitcCommMarkup`
- `packages/iitc-core/src/comm.test.ts`
- `packages/iitc-core/src/player-tracker.ts`
- `packages/iitc-core/src/player-tracker.test.ts`
- `apps/iitc-iris/src/page-map-runtime.ts`
  - `commChannelsData`
  - `sendComm`
  - `refreshComm`
  - `toCommMessagePreview`
  - `IITC_IRIS_MESSAGES.commStatus` dispatch
- `apps/iitc-iris/src/content.tsx`
  - COMM tab switching and refresh actions
  - COMM scroll/older-message state
  - COMM preview rendering
- `apps/iitc-iris/src/messages.ts`
  - `IitcIrisCommState`
  - `IitcIrisCommMessage`

## Public Concepts

Keep IITC names at the boundary:

- Module/facade name: `comm`
- Parser name: `parseMsgData`
- Endpoint name: `getPlexts`
- Channel names: `all`, `faction`, `alerts`
- Request concepts: `minTimestampMs`, `maxTimestampMs`, `plextContinuationGuid`, `ascendingTimestampOrder`
- Storage concepts: `oldestTimestamp`, `oldestGUID`, `newestTimestamp`, `newestGUID`, `guids`, `data`
- Diagnostics: `responseMessages`, `parsedMessages`, `addedMessages`, `oldMessagesWereAdded`
- Hook names are recorded for parity, but not externally fired in this pass:
  - `commDataAvailable`
  - `publicChatDataAvailable`
  - `factionChatDataAvailable`
  - `alertsChatDataAvailable`

## Ownership And Lifecycle

- Pure COMM parsing, request payload generation, write/de-duplication, and preview shaping belong in
  `packages/iitc-core`.
- Browser-only request execution, auth classification, CSRF/version handling, and message dispatch stay in
  `apps/iitc-iris/src/page-map-runtime.ts`.
- React state, scroll retention, tab selection, and rendering stay in `apps/iitc-iris/src/content.tsx`.
- Channel state remains one `IitcCommChannelData` per channel. This pass must preserve current GUID de-duplication and
  older/newer continuation behavior.
- Panel cancellation remains governed by the existing side-panel cancellation policy. Do not make COMM requests cancel
  just because another helper owns the data write.

## Scope

Implement a narrow `comm` facade around existing behavior. Prefer adding a new focused module only if it reduces
duplication in `page-map-runtime.ts` without changing runtime ownership.

Required behavior:

1. Preserve current `getPlexts` request payload generation through `genIitcCommPostData`.
2. Preserve current response parsing and de-duplication through `writeIitcCommDataToHash`.
3. Return a stable write diagnostic object containing `responseMessages`, `parsedMessages`, `addedMessages`, and
   `oldMessagesWereAdded`.
4. Preserve older-message scrollback semantics:
   - older requests use `oldestTimestamp` / `oldestGUID`
   - newer requests use `newestTimestamp` / `newestGUID`
   - newer continuation uses `ascendingTimestampOrder` after the channel has a newest timestamp
5. Preserve current COMM preview rendering data consumed by `content.tsx`.
6. Keep player tracker consumption working from COMM messages.
7. Keep auth/error state output compatible with current `IitcIrisCommState`.

Suggested implementation shape:

- Add `packages/iitc-core/src/comm-facade.ts` only if it exposes small pure helpers such as:
  - `planIitcCommRequest`
  - `applyIitcCommResponse`
  - `getIitcCommMessages`
  - request-state helpers for `loading`, `ready`, `empty`, `error`, and `auth`
  - `toIitcCommPreviewParts` or another UI-neutral preview helper, if existing preview conversion can be moved safely
- Re-export from `packages/iitc-core/src/index.ts` only if the package already exports similar IITC helpers there.
- Update `apps/iitc-iris/src/page-map-runtime.ts` to call the facade helpers where this removes inline request/write
  orchestration.
- Do not move fetch, auth recovery, DOM/Leaflet work, or React scroll behavior into `packages/iitc-core`.
- COMM send state remains in the runtime; this facade only centralizes receive/request state.

## Non-Goals

- Do not add a global store, event bus, service locator, or broad request manager.
- Do not add a second in-memory de-duplication cache; GUID de-duplication already belongs to
  `writeIitcCommDataToHash`.
- Do not expose `window.chat`, `IITC.comm`, `addHook`, or `runHooks` compatibility in this pass.
- Do not port full COMM plugin ecosystems such as richer filters, nickname plugins, player level guess, or Machina
  tracker integration.
- Do not redesign the COMM UI or replace the current bottom-sheet shell.
- Do not change player tracker behavior except to keep existing tests passing after the facade extraction.

## Hook And Plugin Visibility

IITC exposes COMM data to plugins through `window.chat`, `IITC.comm`, and hooks. IITC IRIS will not expose those external
contracts in this pass. The facade should preserve enough internal diagnostics to later compare against the hook timing:

- raw response row count
- parsed message count
- added message count
- channel id
- older/newer request direction
- oldest/newest timestamps and GUIDs before and after write

Any future external hook compatibility must be planned separately after this internal facade is stable.

## Tests And Diagnostics

Add or update focused tests in `packages/iitc-core/src/comm.test.ts` for:

- `planIitcCommRequest` parity with `genIitcCommPostData`, if a new wrapper is added.
- older-message request payloads using `oldestTimestamp` and `oldestGUID`.
- newer-message request payloads using `newestTimestamp`, `newestGUID`, and `ascendingTimestampOrder`.
- `applyIitcCommResponse` parity with `writeIitcCommDataToHash`, if a new wrapper is added.
- duplicate GUID rows reporting zero added messages without a second cache.
- diagnostic object shape and before/after timestamp/GUID fields if those are added.
- request-state helper output for `auth`, `loading`, `ready`, and `error` states.

Keep existing player tracker tests green:

- `packages/iitc-core/src/player-tracker.test.ts`

Manual/live comparison notes to capture after implementation:

- switching `all`, `faction`, and `alerts` still renders cached data immediately and refreshes the selected channel
- Refresh still requests current bounds
- Older still prepends history and keeps scroll position
- send-then-refresh still updates `all` where supported
- auth failure still reports `Intel login required` through the existing COMM state

Implemented notes:

- `packages/iitc-core/src/comm-facade.ts` owns request planning, response application, de-duplication diagnostics,
  channel message access, and receive/request-state construction.
- `apps/iitc-iris/src/page-map-runtime.ts` still owns fetch execution, auth classification, AbortController
  cancellation, send state, player tracker side effects, and app-specific COMM preview shaping.
- Request-state helpers accept a preview callback so `packages/iitc-core` does not depend on `IitcIrisCommMessage`.

## Divergences

- External IITC plugin contracts are deferred. Reason: current IITC IRIS plugin-facing compatibility is intentionally
  limited, and this pass is only an internal stabilization facade.
- The IRIS bottom-sheet COMM UI remains a product-shell divergence from IITC chat panes. Reason: this is already a
  documented shell decision and should not be mixed with core COMM extraction.
- Diagnostics may be more structured than IITC's runtime globals. Reason: typed diagnostics make parity validation
  cheaper without changing user-visible behavior.

## Validation

For code changes, run:

- `npm run test:iitc-core -- --run src/comm.test.ts src/player-tracker.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run lint:iitc-core`
- `npm run package:iitc-iris`
- `git diff --check`

Documentation-only changes do not require the package step.
