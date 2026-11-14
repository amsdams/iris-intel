# Phone UI improvements

Started 2026-11-13 on `feat/ui-improvements`, from accepted core-feature/maintenance commit `fe7ff17`, merged into
local main. The user authorized trying all ten recommendations together. Implementation used three internal slices
(navigation and panel controls; portal details and actions; scores, filtering and COMM) for one combined phone review.

## Phone usability polish — 0.6.0 candidate, 2026-11-14

The user accepted the preceding XPI's appearance and authorized the next ten improvements plus an XPI and signed
APK for testing. The user has now authorized the final review, commit and local main integration of
`feat/centralize-panel-diagnostics`. Documentation cleanup continues separately afterward; no tag or remote publication
is requested. Root/app/manifest/lock versions are 0.6.0; Android retains the alpha/source suffix.

| Priority | Implemented behavior |
| --- | --- |
| UI-21 Keyboard | Visual viewport changes move sheets/navigation above the keyboard; focus stays reachable and the map retains its layout size. Browser pinch zoom retains native viewport translation. |
| UI-22 Screen edges | Sheet/navigation bounds account for safe-area insets and viewport offset; image previews use the same available height. Android's existing native inset/IME handling remains intact. |
| UI-23 Larger text | Appearance offers Normal/Larger text, stored independently of theme/map style. UI typography tokens scale together; labels wrap and list controls remain reachable. |
| UI-24 Freshness | Region scores show age from their existing receivedAt timestamp; portal/mission cache flags identify cached data. Subscription check time stays explicitly labelled; no timestamps or requests are invented. |
| UI-25 Initial states | Passcode instructions replace zero rewards before a response; Inventory distinguishes unloaded data from loaded zero counts. Retained results/errors remain visible. |
| UI-26 Layers | Eight labelled level toggles form a compact four-column group; faction filters stay separate. Highlighters/detail overlays move into secondary disclosures, preserving existing settings. |
| UI-27 Disclosures | Full-width quiet section headings replace button-like pills, with consistent right-hand chevrons and keyboard focus indication. Existing useful counts remain available. |
| UI-28 Profile | Nickname/level, AP and XM lead; AP-to-next-level shares the progress section. XM uses one value/track presentation; invites and static-stat refresh guidance move into More agent information. |
| UI-29 Copy feedback | Portal title/Intel/Prime/GUID copies show Copied beside the triggering action, with local feedback/error text. Existing operation ownership prevents stale promises/timers from replacing newer results. |
| UI-30 Focus/dialogs | Shared visible focus styling; image preview traps focus and makes background siblings inert, restores the trigger, and closes on Escape without closing the portal panel. |

Focused browser checks cover simulated keyboard/offset/safe areas for Search, COMM and Passcode, preference persistence,
larger text and short-screen reachability, modal Tab/Escape/close behavior, copy feedback, freshness without score RPCs,
profile priority and preserved layer settings. The affected 33-case browser run passes. Final validation, visual inspection
and requested artifact identities are recorded below; simulated keyboard evidence does not replace real-device testing.

Final validation and handoff:

- `npm run check` passes: 761 app/core tests and release/build/architecture/lint/types/CSS/workbench gates.
- Full browser coverage contains 106 cases: 103 passed initially; three assertion/fixture races were corrected
  without production changes, then all 16 affected COMM/polish cases passed. The final local dialog-key and partial
  Profile-data refinements pass affected app lint/types and all 15 polish/navigation/header cases. No broad rerun
  was needed for those isolated corrections. Logs: `/private/tmp/iris-ui3-{check-final,browser-final,browser-corrections,final-details-browser}.log`.
- Larger-text Layers/Profile and simulated-keyboard layouts were visually inspected at 320px in both themes.
  The image dialog blocks background shortcuts and restores focus after Escape/Close; incomplete agent stats show
  progress unavailable rather than a fabricated maximum-level bar.
- Requested Firefox XPI: `iitc-iris-firefox-0.6.0-2026-11-14T14-55-31.xpi`; all 24 files match verified dist.
  SHA-256: `16888174d04f58e555a44a1c5c8d0258f6575616fc0da741e776a8c321d3ae2a`.
- Signed APK: `0.6.0-alpha+6730bc7-dirty`, code **1887**. Release checks pass 15 JavaScript and 33 native tests
  plus lint; app ID/certificate are preserved and all 23 embedded web assets match dist.
  SHA-256: `529e84f3628a9530dfcb475595138f3006ffd88824d1282c36fecb16a8ebb444`.
  Both port-6969 downloads are byte-identical. Android log: `/private/tmp/iris-ui3-android-final.log`.
- Code 1887 was an explicit override. Pre-merge review advances the default baseline to `1005 + git rev-list --count HEAD`
  (1888 at the feature base, higher after committing), so main can update the installed candidate. Syntax and monotonicity
  checks pass; UI assets/artifacts are unchanged. Local commit/main integration is authorized; no tag or remote publication.
  Real Firefox/Android keyboard, safe-area and installation acceptance remain with the requested user testing.

## Small-screen UI pass — 2026-11-14

The user authorized all ten improvements on `feat/centralize-panel-diagnostics`, following the centralized
Diagnostics change. The implementation is complete; final validation is recorded below. Preserve the previous
0.5.0 integration history further down rather than create another plan document.

Requested verification XPI: `iitc-iris-firefox-0.5.0-2026-11-14T14-27-21.xpi`, including this UI pass.
Packaged from fingerprint-verified tested assets; all 24 archive files match dist and the port-6969 download.
SHA-256: `0a8c233cc5046772b8c8833ce5ae93c929afbaa917d184949c427400f2a99372`.
User testing is pending. No APK rebuilt; changes remain uncommitted.

| Priority | Improvement | Small-screen outcome |
| --- | --- | --- |
| UI-11 | Header hierarchy | Compact labelled SVG expand/reduce control; title and descriptive status share a separate heading column. Portal owner and wrapped long names remain visible. |
| UI-12 | COMM summary | Always-visible loaded/shown/added line above messages, with a secondary valid time range. Filtered counts appear only when relevant; no summary disclosure or metric cards. |
| UI-13 | Scrolling ownership | Panel bodies own ordinary content scrolling, including Inventory, Missions and Search. Drawing lists use the map panel scroller; tables retain horizontal overflow. COMM retains history scrolling and its short-screen body fallback. |
| UI-14 | Scrollbar consistency | Shared theme-aware scrollbar colors/width, desktop gutter and contained overscroll; navigation retains edge cues. Native touch overlay scrollbars are not hidden. |
| UI-15 | Panel information order | COMM counts and Inventory/Missions totals/context lead their bodies; controls and actionable errors follow before content. Existing Portal actions and Scores information priorities remain intact. |
| UI-16 | Contextual Inventory summary | Three overall totals, then selected-portal name/key count only when applicable; loose/capsule breakdown is disclosed. Missing keys show zero after inventory has loaded, Unknown beforehand. Portal count remains with Top keys. |
| UI-17 | Missions browsing | Compact count/source context first; selected metrics stay with the selected mission. Empty metric cards and missing-rating placeholders are removed; Create lives under Mission tools. |
| UI-18 | Visual hierarchy | Quieter shared row/card borders and surfaces; panel bodies use 96% opacity across portal/request/map panels. Primary actions, selection and faction/game colors remain distinct. |
| UI-19 | List/text consistency | Mission/key/search names and support text wrap; mission rows prioritize rating/duration/waypoints. Supporting list text uses 11px; touch list, header and main control targets retain 44px minimums. |
| UI-20 | Selected controls | Missions View/Portal uses segmented selected styling and aria-pressed; Refresh remains separate. Requests retain their existing explicit source-selection behavior. |

Validation for this batch:

- `npm run check` passes: 761 app/core tests, release/build/architecture gates, lint, types, CSS and workbench build.
- Focused header, COMM and short-screen panel checks pass. Three workflow cases exercise mission source switching,
  long-content scrolling, selected key zero/one counts and absence of another inventory fetch when selection changes.
- Shared header geometry and overflow checks cover 320px/412px touch widths, desktop and short landscape. COMM
  filtering still reports visible/loaded counts and retains history, drafts, older-message loading and composer checks.
- Full `npm run test:browser:reuse` passes all 100 cases (1.1 minutes); `git diff --check` passes. Narrow-phone
  Inventory/Missions surfaces were visually inspected in dark/light themes, along with COMM and long portal headers.
  Browser evidence uses Chrome; Firefox/WebView interaction and native overlay scrollbar appearance still need
  user/device verification. Logs: `/private/tmp/iris-ui2-{check,browser-final}.log`.

## Testing cadence — clarified 2026-11-14

- Plan/docs edits: `git diff --check`; no application tests or packages.
- During implementation: affected lint/types and the smallest relevant browser files or named cases. Group related
  visual edits before checking; do not run every check after every CSS adjustment. Shared header/scroll changes
  warrant the panel/header/phone cases; COMM changes warrant its usability/history/composer cases.
- Inspect representative narrow-phone and short-landscape layouts in both themes. Geometry/behavior tests and
  visual inspection serve different purposes; avoid adding tests that merely restate markup or styling constants.
- Once the batch settles: `npm run check`, the full browser suite and `git diff --check`. The latest 97-case browser
  suite took 1.1 minutes. Repeat affected checks after fixes; repeat broad checks for unresolved integration risk or
  shared behavior changes, rather than automatically after an isolated correction to a test assertion.
- Reuse fingerprint-verified web assets when production inputs are unchanged. Package XPI/APK only when requested;
  an artifact-only request after successful validation needs build/archive/download verification, not another full suite.

## Previous handoff — 0.5.0 integrated into local main

The user accepted the final session result, requested a concise changelog in place of per-version release notes,
and authorized moving the reviewed branch into local main. Root/app/manifest/lockfile are 0.5.0; Android remains
0.5.0-alpha. Final validation passes: 758 app/core tests, 94 browser cases, 15 Android JavaScript + 33 native tests,
release lint and signing/assets/download verification. The reviewed source and docs are committed together
and fast-forward integrated into local main. No tag, remote push, publication or additional artifact build is requested.
See [changelog](../../../CHANGELOG.md) and [version workflow](../../../README.md#versioning-and-releases).
Earlier checkpoints below retain their status at the time they were recorded.

## Goal and scope

Optimize the small-screen workflow: find a portal, inspect it, take an action, return to the map. Keep important
information and common actions easy to reach while making deeper details available through clear disclosures.
Preserve the five main areas and familiar IITC terminology. Use existing components rather than a new shell or theme.

## Implemented recommendations

| Item | Bring forward | Move back / group |
| --- | --- | --- |
| UI-01 Map navigation | Search, Missions and Regional scores first, then Layers and Locate | Counts/List/Viewport scores under Analysis; drawn Links/Markers under Draw tools. Opening either group closes the current panel. Keyboard Back/Escape returns to the group trigger. Menus scroll on short screens. |
| UI-02 Portal summary | Name, faction, level, health, resonator count and loaded key count | Photo reduced to 44px; owner restored as a compact secondary header line and retained in Facts. Keys show Unknown until inventory is available; a loaded selection with no keys shows zero. No inventory fetch added. |
| UI-03 Portal actions | Zoom, Navigate and Share with 44px targets | Share contains title/Intel/Prime copies and QR; GUID under Advanced sharing. Navigate opens provider choices. Full Map links remains below details. Copy feedback follows the latest action. |
| UI-04 Portal details | Mods and resonators first; energy/range immediately below them | AP, hacks, attack modifiers and coverage in Advanced statistics. Owner/history/topology remain in Facts with existing persisted section settings. |
| UI-05 Panels | Shared Expand/Reduce and close placement; sticky headers | Long panels can fill available screen height without covering navigation. Portal scroll position, open sections and expansion survive a temporary return to the map. |
| UI-06 Filters | Hidden-data summary on map and Layers; inspect and Show all map data | Larger sets disclose their names. Reset affects map-data visibility; highlighters and decorative overlays remain unchanged. Coverage notice still distinguishes zoom omissions from empty data. |
| UI-07 Regional scores | Global scores first, then region averages/lead and an expanded Top agents list with ranked rows | Checkpoint chart/table, projections and cycle metadata remain disclosures. Regional scores and Viewport scores have distinct names. |
| UI-08 COMM | Messages and composer; active-filter description and immediate reset | Message-count/range statistics disclosed immediately above Technical details; advanced filters/saved views remain collapsed. Composer stays visible while scrolling, with scroll clearance for short landscape filters. Channels also remain in bottom navigation. |
| UI-09 Consistency | Readable shared disclosure labels; primary navigation/portal actions and touch header buttons at 44px | Secondary navigation stays compact at 36px; coarse-pointer disclosures are 40px. Shared panel header/size/close controls and disclosure styles. |
| UI-10 Status | Loading/errors and recovery messages; explicit previously received data on failed score/COMM refresh | Routine ready/idle header badges omitted; footer request/cache/endpoints/timing are under Technical details. Authentication and other errors stay outside that disclosure. |

No default map provider is invented. Google/Bing/OSM location links, explicit OSM directions and Android's generic
location-viewing handoff retain their accepted behavior. QR payload and Prime/Intel sharing formats are unchanged.
Changelog/What's new remains a separate future idea.

## Contracts and validation

- Preserve stored keys, message contracts, data/request lifecycles and map-layer ownership. Regrouping does not
  disable features; hidden optional panels remain hidden without changing drawings or layers.
- Use explicit controls, keyboard access and labelled touch targets; no swipe gesture is required.
- Focused browser checks cover portal statistics/ranges, map links on browser/Android hosts, actual QR decoding,
  regional history/projections, request cancellation/reload, panel preferences and all-panel reachability.
- New touch checks cover 320px/412px portal actions, loaded/unknown keys without inventory RPC, Navigate choices,
  Expand/Reduce, portal scroll/disclosure restoration, keyboard menu return, short-landscape menu bounds, and
  persisted multi-filter reset while preserving decoration settings.
- COMM checks cover both themes, expanded filters on phones/short landscape, saved views, drafts and late delivery.
- Final repository/browser validation and the requested combined test XPI are recorded after completion below.

User review and local main integration are now authorized; see the current handoff above. Remote publication is not requested.

## Final validation and test handoff

- `npm run check`: pass — 149 core + 609 app tests (758), release/build/architecture gates, lint, types, CSS and
  workbench production build. The final menu sizing adjustment also passes `npm run lint:css`.
- `npm run test:browser`: all 88 pass (two workers, 1.1 minutes), including the new touch/short-landscape cases.
  Full-run findings corrected an input-height inconsistency and border-box sizing on the capped menu.
- `git diff --check`: pass.
- Requested Firefox XPI packaged once after final browser validation with verified build reuse:
  `apps/iitc-iris/builds/iitc-iris-firefox-0.1.2-2026-11-13T21-37-38.xpi`.
  All 24 archive files match `dist`; SHA-256
  `8fa6be6b2160c245de66e0cb44e3ae526a35c095f605ae731f0e8ac5c97879b9`.
- No Android/native changes or new APK build in this UI pass. Real phone/user acceptance and merge are pending.

Validation logs: `/private/tmp/iris-ui-check-final.log`, `/private/tmp/iris-ui-css-final.log`,
`/private/tmp/iris-ui-browser-verified.log`, `/private/tmp/iris-ui-package.log`.

## User feedback refinements

The user requested these adjustments after reviewing the first combined UI build:

- Portal glance (energy/link range) follows Mods and Resonators.
- Map order: Search, Missions, Regional scores, Layers, Locate, Analysis, Draw tools, Controls.
- Opening Analysis or Draw tools closes the current panel through normal navigation, including request cancellation.
  The group remains open over the map; Back/Escape leaves the map visible and returns keyboard focus.
- Global scores are expanded at the top. Region averages/lead follow, then expanded Top agents as ranked rows,
  before checkpoint charts/projections. All returned agents remain available.
- Focused browser checks cover the new ordering and both menu transitions from Layers, including group close/toggle.

The earlier XPI `2026-11-13T21-37-38` predates these refinements. No new downloadable package was requested.
Follow-up validation passes: `npm run check` (758 app/core tests and all repository gates), eight focused browser
cases, full `npm run test:browser:reuse` (all 88 cases, 1.0 minute) and `git diff --check`.
Logs: `/private/tmp/iris-ui-feedback-check.log`, `/private/tmp/iris-ui-feedback-focused.log`,
`/private/tmp/iris-ui-feedback-browser.log`.


## Menu overflow indicator and requested verification build

The user approved a subtle edge indicator and requested a fresh XPI including all feedback refinements.
Secondary navigation now shows a decorative fade/chevron only on edges with hidden items. Indicators update after
scrolling, viewport/button resizing, menu changes and optional-panel visibility changes. They do not intercept clicks
or swipes and are hidden from assistive technology; menu buttons remain the keyboard controls.

The phone browser suite verifies start/middle/end positions, viewport resizing, disappearance in shorter menus and
return to Map. Build identity and final validation are recorded below after packaging.


Final checks pass: `npm run check` (758 app/core tests and repository gates), all 89 browser tests and
`git diff --check`. Requested XPI: `apps/iitc-iris/builds/iitc-iris-firefox-0.1.2-2026-11-13T21-54-16.xpi`.
All 24 archive files match the fingerprint-verified web output, and the download served on port 6969 is byte-identical.
SHA-256: `e026e822fc3891111155e817b094f4d9dd275c188bfe8c67c55a1a94bc9d0e5a`. This supersedes the earlier UI XPI and includes all user-feedback refinements.
Logs: `/private/tmp/iris-ui-menu-edge-check-final.log`, `/private/tmp/iris-ui-menu-edge-browser.log`,
`/private/tmp/iris-ui-menu-edge-package.log`. User verification and merge remain pending.


## Panel header alignment verification

The user requested alignment verification and a new XPI only if changes were needed. Browser geometry reproduced
a 14.5px title/control center offset at 320px: shared headers and their action rows were top-aligned. Header grids
and action rows now center their contents vertically. The portal header also centers its title/faction block,
photo and controls, including wrapped titles. The coarse-pointer button rule now has enough specificity to give
Close the same intended 44px minimum height as Expand.

New `panel-headers.smoke.mjs` checks shared headers (Layers, Controls, Search, Profile, COMM, Appearance, Diagnostics,
About) plus short/long portal names at 320px/412px touch widths, 1200px desktop and 780×280 landscape, across both
themes. Geometry checks require title/control center differences within 1px and reject overlap/horizontal overflow.
The initial check reproduced the defect before the CSS fix; all four focused cases pass afterward.
Final validation and requested package identity are recorded below after completion.


Header verification passes: `npm run check` (758 app/core tests and repository gates), all 93 browser tests,
and `git diff --check`. Requested XPI rebuilt because alignment fixes were needed:
`apps/iitc-iris/builds/iitc-iris-firefox-0.1.2-2026-11-13T21-59-37.xpi`. All 24 files match verified `dist`; the port-6969 download is byte-identical.
SHA-256: `092058f337305e0f693159c43b9fe7c6e2e30264b1f61d3d62e7a6be79d98739`.
Logs: `/private/tmp/iris-header-before.log` (reproduction), `/private/tmp/iris-header-focused.log`,
`/private/tmp/iris-header-check.log`, `/private/tmp/iris-header-browser.log`, `/private/tmp/iris-header-package.log`.
User verification and merge remain pending.


## Header inset, portal owner and COMM footer feedback

The user requested a review of left padding, restoration of the portal owner in the header, and Technical details
as COMM's final section. All panel shells now share the existing `--iitc-iris-panel-padding` token (8px vertical,
10px horizontal). Header backgrounds extend 6px within that outer inset with matching inner padding, providing
breathing room while preserving alignment of header text/images, content and controls. Vertical centering remains.
Portal owner is shown as a compact secondary line (muted label, faction-colored nickname, wrapping for long names)
and is still present in Facts.

COMM's loaded-message summary now appears explicitly between send feedback and the technical footer in the DOM.
The CSS `order: 10` workaround is removed; visual, keyboard and reading order follow the same markup.
Header checks now verify the shared content inset, extra header background padding, long owner names and matching
header centers. They also verify COMM footer order in both the DOM and rendered layout. Focused checks pass (18
cases); final repository/browser validation is recorded below when complete. No new package was requested for this
feedback pass; XPI `2026-11-13T21-59-37` predates these changes.


Final validation passes: `npm run check` (758 app/core tests and repository gates), all 93 browser tests and
`git diff --check`. Logs: `/private/tmp/iris-header-owner-comm-check.log`,
`/private/tmp/iris-header-owner-comm-focused.log`, `/private/tmp/iris-header-owner-comm-browser.log`.
Screenshots reviewed for header inset and long portal owner/title wrapping. No XPI/APK rebuilt in this pass.


## Final user-verification XPI

The user requested a fresh XPI including header inset, restored owner and COMM footer ordering.
Packaged verified web output as `apps/iitc-iris/builds/iitc-iris-firefox-0.1.2-2026-11-13T22-09-58.xpi`.
All 24 archive files match `dist`, and the port-6969 download is byte-identical.
SHA-256: `b9cb426640a298b0dd0d675b6961948ad5075ca869cedc47a931162673ea1de0`. Packaging log: `/private/tmp/iris-ui-verification-package.log`.
Existing validation remains 758 app/core tests, 93 browser tests and repository gates; no source changes since that
validation. User testing is pending before wrap-up/main integration. No commit, merge or push performed.


## Softer dark headers

The user requested a slightly softer dark header background. Shared and portal headers now use a dedicated
`--iitc-iris-header-rgb` palette value: dark blue-gray `24 32 40` instead of the near-black panel value `2 10 16`.
Header opacity is preserved for scrolling readability; the light-theme header color is unchanged. Final validation
is recorded below after completion. XPI `2026-11-13T22-09-58` predates this cosmetic adjustment.


Dark-header softening validation passes: `npm run check` (758 app/core tests and all repository gates), all 93
browser tests and `git diff --check`. Dark header screenshot reviewed. Logs:
`/private/tmp/iris-header-soften-check.log`, `/private/tmp/iris-header-soften-browser.log`. No new package requested.


## 0.5.0 final review and signed APK handoff

Session review, user-feedback adjustments and version/docs preparation are complete. Review fixed tool menus
being hidden when a selected portal restored its menu, native Back clearing selection before a chooser, and stale
Back handlers immediately after navigation. Overflow tracking follows the displayed menu. Native Back and Escape
priority are covered by the new phone regression case, including focus outside the chooser.

Validation passes: `npm run check` (758 app/core tests and gates), affected lint after the final observer adjustment,
all 94 browser cases and `git diff --check`. Signed Android release passes 15 JavaScript and 33 JUnit tests plus lint.
APK `0.5.0-alpha+fe7ff17-dirty` (1883) uses the preserved app ID/certificate. All 23 embedded assets match verified web
output and the port-6969 download matches byte-for-byte. SHA-256: `cc68e655a99fcb0175272dfd43471b9f9006bbc4eed94152bfac7c8feb9101f4`.
See [changelog](../../../CHANGELOG.md) for user-facing changes; APK verification evidence and integration status are retained here.
Only the requested signed APK was built for this handoff; earlier XPIs predate final review/version changes.
User final phone acceptance is pending. Main remains `fe7ff17`; source changes remain uncommitted.


## Documentation wrap-up

The user accepted the session result as good enough and requested a simple, shareable changelog with history.
Per-version release notes were replaced by root `CHANGELOG.md`; versioning guidance was consolidated into the
existing root README. Historical entries summarize dated Android milestones from Git history and the existing
handoff records. Engineering evidence, APK checksum and build/test logs remain in this plan. No new detailed phone
test results are inferred, and main integration has not been performed.
