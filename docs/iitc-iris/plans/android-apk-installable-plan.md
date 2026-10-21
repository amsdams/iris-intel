# Android APK Installable Plan

## Plan Dashboard

Status: 0.3.0 mode persistence, IRIS startup after reopen, and stock-dashboard blocking confirmed on phone;
Panel Back, rotation, and restoring the open panel after Reload also passed; background/resume responsiveness also passed. Phone login/persistence passed on 0.1.3;
0.2.0 bundled IRIS injection and a quick feature smoke test passed. Repository cleanup completed on
2026-10-20. The npm workspaces remain `apps/iitc-iris` and `packages/iitc-core`; the Gradle spike lives separately at
`apps/android-intel-spike`. Builds no longer require legacy apps or local reference assets.
The repository/platform ownership and map-replacement lifetime pass is implemented and user smoke accepted.
See [the architecture reference](../architecture.md#browser-and-runtime-ownership) for the current ownership inventory.

This plan answers what must be decided and proven before trying to create an installable Android APK/AAB. It is not a
refactoring plan, and it should not be mixed with UI extraction or source-layout cleanup.

### Done

- 0.3.7 signed APK distribution is implemented and published alongside XPI/ZIP after PR #3 merged as `c8a7d4b`.
  Main CI passed extension checks/package and Android release tests/lint/build. The downloaded release APK's
  checksum, pinned certificate, version, and all 19 embedded IRIS assets were verified. Dedicated signing credentials
  are in GitHub secrets; the user confirmed the ignored signing directory is backed up. First phone installation of
  the release-signed APK remains unreported; uninstall the earlier debug installation once before installing it.

- 0.3.6 replaces CARTO Dark/Light with keyless OpenFreeMap styles through MapLibre’s Leaflet binding.
  The worker is bundled in both extension and APK; saved preferences migrate. Real-tile browser switching,
  pan/zoom, map replacement, and cross-origin worker checks pass. The user tested XPI and APK and reported
  both look fine (2026-10-21).

- 0.3.5 fixes player-tracker shadow hit interception and retains marker identity through COMM refreshes.
  Browser reproduction and three regression tests pass. The user confirmed popup opening in both XPI and APK
  (2026-10-21); history-link behavior was not separately reported.

- The initial 2026-10-04 search found no native Android app. A disposable login shell has now been added; no permanent
  IRIS Android scaffold exists yet. Version 0.3.0 adds automatic signed-in injection and wrapper hardening in the disposable shell.
- Merge checkpoint complete: PR #1, main CI, and latest-extension publishing passed.
- Debug APK assembly, Android lint, 27 native tests, 13 session/injection tests, APK signature verification,
  and the local artifact download routes pass. Existing extension checks (528 tests) and packaging also pass.
  Phone installation passed; the first login test opened Chrome and returned to the login page.
  The shell embeds the previously missing `login.ingress.com` host. Version 0.1.1 diagnostics confirmed
  `accounts.google.com` was the remaining external handoff; 0.1.2 tests IITC-style embedded Google login.
  Version 0.1.2 phone test: account selection stayed in the app; a reported HTTP 400 / malformed-URL error
  preceded recovery using the Intel button, then the stock map loaded and Check session reported PASS.
  Saved-password selection did not work. Version 0.1.3 phone retest reached the stock Intel map while staying
  in the app and stayed logged in after force-stop/reopen. Version 0.2.0 displayed IRIS on the phone; the user
  accepted a quick smoke test of inventory, layers, COMM, portal details, and missions. The native round-trip
  PASS label was not separately reported; functional UI/runtime communication was exercised by the smoke test.
- Targeted IITC mobile prior-art review completed for the login shell: WebView settings, navigation, cookie lifecycle,
  and user-agent handling. The [spike README](../../../apps/android-intel-spike/README.md) records adopted/rejected patterns.
- Reference IITC-CE Android prior art exists under `reference/IITC-CE/mobile/` and
  `reference/ingress-intel-total-conversion/mobile/`.
- First target decided: private/friends sideloadable APK. Store/Play distribution is deferred.
- Browser boundary owners are inventoried in the architecture reference: assets, injection/messaging, clipboard, geolocation,
  preferences, runtime caches, and Intel authentication. The spike now replaces asset loading and hosts the
  existing page messages. Phone clipboard copying passed for markers and portal titles through the existing web path.
  Location reported permission denied on 0.3.0 because it was disabled. Version 0.3.1 adds on-demand foreground
  coarse/fine Android permission and an Intel-only WebView handler, with cancellation on navigation/disposal;
  approximate access is accepted and no separate WebView grant is persisted. The user confirmed prompts,
  permission acceptance, and successful positioning on phone (2026-10-21).
  Other Android platform replacements remain unimplemented.
- Shared asset URL resolution and map disposal are implemented. Automated checks pass (517 tests, workbench checks,
  CSS lint, and extension packaging); the user reported the cleanup smoke test passed on 2026-10-20.
- Browser-extension packaging remains owned by:
  - `apps/iitc-iris/manifest.json`
  - `apps/iitc-iris/package.json`

### In Progress

- Location denial failed on 0.3.3: after reinstalling and denying two prompts, Locate caused status-bar flicker and
  app closure. No device crash trace is available. Version 0.3.4 hardens denial retention, suppresses automatic and
  permanently-denied Android retries, drops cancelled callbacks, and adds request-count diagnostics. The user
  received one prompt, denied it, and saw permission denied on 0.3.4. A second Locate produced one prompt; after
  denying again, further taps stopped prompting. Enabling location including precise access in Android settings
  restored successful positioning. The reported denial regression passed the phone retest; its original crash mechanism
  was not established from a device trace.

- Fresh-install/other-account regression: Google handed off to external `accounts.google.nl`, followed by HTTP 400.
  Version 0.3.3 replaces individual Google host additions with 187 exact account hosts derived from
  [Google’s supported-domain list](https://www.google.com/supported_domains), verified 2026-10-21 and pinned with
  a source hash. All entries/boundaries are tested; the user confirmed 0.3.3 works, with location and clipboard
  still working. Individual regional login flows have not all been exercised.

- Version 0.3.1 location prompts, permission acceptance, and successful positioning passed on phone.
  Denial/retry and precise-location recovery passed on 0.3.4; approximate-only access and navigation/rotation cancellation remain unreported.

- Version 0.3.0 adds automatic signed-in injection, exact stock-dashboard entry interception, persistent IRIS/Stock Intel
  modes, Back through image/panel/selection before backgrounding, and timer/probe pause/resume. On 2026-10-21 the user
  confirmed both modes persist across close/reopen, IRIS starts again, and Diagnostics shows stock dashboard blocked.
  The user also confirmed Back closes a panel, rotation follows the phone, and Reload restores the open panel.
  Background/resume responsiveness was subsequently confirmed. Back from image/selection/plain map remains unreported;
  no privileged bridge is added.
- Version 0.1.3 keeps the exact `accounts.google.com` and `accounts.youtube.com` hosts embedded and tests IITC-style
  user-agent rewriting. A repeated 0.1.2 test identified `accounts.youtube.com` as the remaining external handoff;
  0.1.3 corrects its routing; the user confirmed sign-in stayed in the app and reached the stock map.
  This is an unsupported compatibility experiment under Google’s embedded-user-agent restrictions, not a permanent
  auth decision. Login persisted across force-stop/relaunch on 0.1.3. Google Password Manager autofill remains
  unresolved. No 400 was reported in the latest successful sign-in.

### Immediate Next Work

First install/smoke the published release-signed APK; the prior debug installation needs one uninstall/reinstall.
See [the roadmap handoff](index.md#next-session-handoff) for release evidence and the overlapping-player-marker pickup.

The feasibility spike is complete for the tested paths: login/persistence, bundled IRIS and runtime communication,
stock-dashboard blocking/recovery, panel Back, rotation/reload, background/resume, clipboard, and location including
repeated denial and precise-location recovery. Promote the existing wrapper into the permanent project; update
names/scripts and move test controls behind accessible diagnostics/recovery UI. Carry the Google login compatibility
workaround and unresolved password-manager support forward explicitly; this conclusion is not production-auth approval.
Draw Tools currently exchanges JSON through text/clipboard; no file picker/download UI exists, so native file
import/export is deferred capability work rather than an existing-feature spike acceptance test.

Location success, repeated denial, and precise-location recovery passed on phone. Keep approximate-only access
and navigation/rotation cancellation in future device regression checks; see the spike README.

The main 0.3.0 [spike](../../../apps/android-intel-spike/README.md) wrapper smoke passed: startup after reopen,
stock-dashboard blocking, panel Back, rotation, restoring the open panel after Reload, and background/resume responsiveness.
Keep Back from image/selection/plain map in future device regression checks. Carry outstanding platform capabilities
and auth-policy decisions into permanent packaging; reuse the existing ownership inventory.

If Intel uses Google OAuth, account for its
[embedded-user-agent restrictions](https://developers.google.com/identity/protocols/oauth2/policies#use-secure-browsers).
Validate the supported sign-in/session path before choosing the wrapper. A disposable spike shell is allowed; the
working compatibility proof can be promoted while the permanent authentication decision remains explicitly open.

### Todo

- Promote the tested shell while preserving its known authentication and platform limits.
- Audit and adapt extension-only assumptions.
- Bring forward the release/mobile must-haves from `../port-plan.md` and `../backlog.md`.
- Signing/build/install documentation and automated APK publishing are complete; finish the permission/privacy and
  release-readiness review before wider sharing. Verify the signing backup can be restored when convenient.

## Current Repo Facts

IRIS is currently a Manifest V3 content-script extension. It injects `content.js` and CSS into
`https://intel.ingress.com/*`, exposes `page-map-runtime.js` as a web-accessible resource, and packages Chrome/Firefox
extension zips through Vite scripts.

A disposable native Intel login test now exists in `apps/android-intel-spike`. It produces a debug-signed APK through
`npm run android:build` / `npm run android:check`; `npm run android:release` builds the release APK using configured
signing credentials. GitHub publishes signed APKs alongside extensions. `npm run serve` lists local XPI, ZIP, and debug APK downloads.
`npm run android:serve` remains an alias; default port is 6969.
Version 0.3.0 bundles existing IRIS assets and injects them automatically on signed-in Intel in IRIS mode. Local asset interception
is restricted to `/__iris_android__/`; the shared asset resolver accepts an explicit host base, and the runtime
keeps its existing script-relative image URLs. Permanent Android packaging remains undecided.

The reference IITC-CE mobile app is native Android/WebView prior art, not an IRIS implementation. It uses an Android
Gradle project, `org.exarhteam.iitc_mobile`, a WebView activity, native permissions, signing configs, and Android
resources. It is useful for architecture research, but it should not be copied wholesale without deciding how IRIS will
own injection, auth, storage, permissions, and releases.

## Distribution Decision

The first path is selected; retain alternatives for a later distribution decision.

| Path | Use When | Main Cost |
| --- | --- | --- |
| Sideload debug/release APK | The first goal is sharing with friends for real-device testing. | Still needs native wrapper, signing, permissions, and install docs. |
| Play-distributable AAB | The goal is public or wider distribution through Google Play. | Requires Play policy/readiness, target SDK compliance, release signing, store metadata, and review risk. |
| TWA/PWA wrapper | IRIS becomes a hosted web app that the Android shell opens fullscreen. | Needs a hosted app, asset links/site ownership, and does not match the current extension injection model. |
| Browser extension/add-on route | Android browser support is the real goal, not APK installability. | Depends on browser extension support and store/distribution rules, not Android APK packaging. |

First target: sideloadable APK shared with friends for real-device testing. Do not aim for Play release or store
readiness until the sideloaded APK proves useful and the remaining release risk is understood.

## Current External Packaging Facts

Re-verify these before implementation, because Android and Play requirements move over time.

- Google Play currently requires uploaded APKs/app updates to meet its target API policy; the official target API page
  currently says new apps and updates must target Android 16 / API level 36 or higher, with listed exceptions.
- Google Play distribution should be planned around Android App Bundles for new app publishing. Play can generate
  optimized APKs from an uploaded signed bundle.
- Any installable Android build, including a directly installed APK, needs signing.
- A Trusted Web Activity launches web/PWA content in a fullscreen browser surface. That path only makes sense if IRIS is
  hosted as a web app and the site/app relationship can be verified.
- Capacitor is a possible wrapper only if IRIS becomes a regular web build; its CLI can build signed AAB/APK output from
  the native project.

Useful official references:

- <https://developer.android.com/google/play/requirements/target-sdk>
- <https://developer.android.com/guide/app-bundle>
- <https://support.google.com/googleplay/android-developer/answer/9859152>
- <https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities>
- <https://capacitorjs.com/docs/cli/commands/build>

## Key Risks

- The current extension model depends on content-script injection and `chrome.runtime.getURL`; Android WebView does not
  provide the same extension runtime.
- IRIS relies on page/runtime messaging via `window.postMessage`; the Android shell must either preserve this boundary
  or replace it with a deliberate WebView bridge.
- Auth, cookies, and CSRF need a proof. The current runtime reads `document.cookie` for request tokens inside the Intel
  page context.
- Geolocation, clipboard, downloads/imports, file picking, deep links, storage, cache clearing, and network hosts need an
  Android permission and privacy audit.
- The reference IITC mobile app targets the legacy IITC architecture. IRIS should not inherit native/plugin behavior
  unless the behavior is intentionally ported and tested.
- Release builds require signing, versioning, min/target SDK choices, and reproducible build commands.

## Must-Haves From Port Plan And Backlog

These are required before calling an installable Android build ready for use beyond a throwaway spike.

- Permission/manifest audit: geolocation, clipboard, downloads/imports/exports, host/network access, browser-specific
  behavior, and user-action-tied permission prompts.
- Live auth/login recovery validation: expired sessions, login-required states, logout behavior, and whether automatic
  background retries pause correctly while login recovery is active.
- Runtime request/cancellation policy: map data, panel requests, missions source changes, hidden subscription/search
  requests, and stale-response behavior must still match the documented policies after moving into an Android shell.
- Cache policy matrix: document cache keys, TTLs, invalidation, memory vs persistent storage, and acceptable stale data
  for map/entity data, portal details, missions, inventory key counts, search, COMM, scores, and subscription status.
- Mobile ergonomics pass: sheet height, sticky headers/footers, map gestures, long-press conflicts, keyboard shortcuts,
  and dense panels in portrait.
- Accessibility baseline: focus order, Back/Escape-equivalent behavior, button labels/titles, reduced-motion
  expectations, and faction/rarity/mission/warning/disabled contrast.
- Release checklist: exact build/package commands, artifact names, smoke-test routes, fixture locations, and minimum
  live-Intel checks before sharing a package.
- Parity divergence notes: the bottom-sheet/two-layer menu model, limited plugin-facing compatibility, and Draw Tools v1
  scope are acceptable only if they remain documented as intentional gaps.

## Next 10 Assignments

Use "assignment" as the single active-work term. Assignments 2–5 may be completed together in the first spike; retain
their individual evidence and stop conditions.

| # | Assignment | Status | Done When |
| --- | --- | --- | --- |
| 1 | Distribution decision | Done | First target is private/friends sideload APK; Play/store distribution is deferred. |
| 2 | Android prior-art audit | Partial: targeted auth-shell review complete | Reference IITC mobile files are summarized into reusable patterns and rejected patterns. |
| 3 | Runtime boundary audit | Partial: browser owners inventoried | Every extension-only assumption has an owner, replacement, or explicit non-goal. |
| 4 | WebView auth spike | Phone login/persistence passed on 0.1.3; earlier request PASS; compatibility policy unresolved | A minimal Android/WebView shell can load Intel, authenticate, and observe required cookies/tokens. |
| 5 | IRIS injection spike | Phone UI/feature smoke accepted on 0.2.0; native PASS label not separately reported | A minimal IRIS bundle can load in the shell and exchange one map/runtime message. |
| 6 | Storage and asset strategy | Todo | Local storage, bundled assets, fixture paths, icons, imports/exports, and cache behavior are defined. |
| 7 | Permission, privacy, and release-readiness audit | Todo | Android permissions plus backlog must-haves are listed and minimized. |
| 8 | Android project scaffold | Todo | Native project exists only after assignments 4 and 5 pass. |
| 9 | Debug APK build and mobile smoke test | Tested paths accepted; remaining edge/accessibility cases retained | A signed debug APK installs and performs mobile/accessibility smoke paths on a real device. |
| 10 | Friend-shared APK release plan | Signed publishing/versioning/install notes done; release phone smoke and wider-sharing review remain | APK signing, versioning, install notes, privacy notes, and update/rollback strategy are documented. |

## Assignment Details

### Assignment 1: Distribution Decision

Goal: record the first distribution target before writing Android code.

Questions:

- Is this only for personal/friends install/testing, or should it eventually be public?
- Is Play Store distribution required now, or is sideloading enough?
- Must the app work without a hosted IRIS web app?
- Is Android browser extension support acceptable instead of APK installability?

Current answer: sideloading is enough for the first shared APK. Store and Play AAB work stays deferred until a later
release plan.

Stop if the target changes to "browser extension/add-on"; that needs a different plan.

### Assignment 2: Android Prior-Art Audit

Goal: learn from IITC-CE mobile without committing to a port.

Inspect:

- `reference/IITC-CE/mobile/app/build.gradle`
- `reference/IITC-CE/mobile/app/src/main/AndroidManifest.xml`
- `reference/IITC-CE/mobile/app/src/main/java/org/exarhteam/iitc_mobile/IITC_Mobile.java`
- `reference/IITC-CE/mobile/app/src/main/java/org/exarhteam/iitc_mobile/IITC_WebView.java`
- `reference/IITC-CE/mobile/app/src/main/java/org/exarhteam/iitc_mobile/IITC_WebViewClient.java`
- `reference/IITC-CE/mobile/app/src/main/java/org/exarhteam/iitc_mobile/IITC_JSInterface.java`

Document:

- WebView setup needed by Intel;
- URL/deep-link handling worth preserving;
- permissions that IRIS actually needs;
- native bridge behavior that IRIS should avoid for the first APK;
- build/signing patterns that remain current enough to reuse.

### Assignment 3: Runtime Boundary Audit

Goal: complete the Android replacement decisions for current browser-extension assumptions.

The browser-side owner inventory is already recorded in [the architecture reference](../architecture.md#browser-and-runtime-ownership).
Asset resolution lives in `src/platform/assets.ts`; map resources have an explicit lifetime. Do not repeat that refactor
or treat this partial inventory as a tested Android bridge. File handling, network/deep-link behavior, Android storage,
and authentication/session behavior still require Android-specific decisions and proof.

Start with:

- `apps/iitc-iris/manifest.json`
- `apps/iitc-iris/package.json`
- `apps/iitc-iris/src/content.tsx`
- `apps/iitc-iris/src/page-map-runtime.ts`
- `apps/iitc-iris/src/shell/storage-settings.ts`
- `apps/iitc-iris/src/platform/assets.ts`
- `apps/iitc-iris/src/map/map-runtime-lifetime.ts`
- `apps/iitc-iris/src/map/missions-panel/missions-panel.tsx`

Must cover:

- `chrome.runtime.getURL`;
- content-script injection timing;
- web-accessible assets;
- `window.postMessage` boundary;
- cookies/CSRF;
- local/session storage;
- geolocation;
- clipboard;
- imports/exports and file handling;
- host/network access.

### Assignment 4: WebView Auth Spike

Goal: prove Android can host the Intel page in the intended shell.

Done when:

- the shell loads `https://intel.ingress.com/`;
- a supported login/auth flow reaches the map for an authorized test account/device, including session persistence
  after reopening the spike shell;
- an authenticated Intel request succeeds with the chosen cookie/CSRF approach; record expiry/logout behavior without
  recording secrets or session tokens;
- failure behavior is understood and documented.

No IRIS UI work belongs in this assignment.

### Assignment 5: IRIS Injection Spike

Goal: prove a tiny IRIS bundle can run inside the chosen Android shell.

Done when:

- an Android shell loads one compiled IRIS runtime asset;
- one message travels from shell/content UI to page runtime or the replacement bridge;
- one message travels back;
- the approach does not require a broad rewrite of `content.tsx` before the spike is useful.

### Assignment 6: Storage and Asset Strategy

Goal: define where Android stores and loads everything IRIS expects.

Must cover:

- settings storage compatibility;
- Draw Tools import/export data paths;
- marker/icon/Leaflet assets;
- fixture/demo data paths;
- cache clearing;
- backup/restore expectations.

### Assignment 7: Permission, Privacy, and Release-Readiness Audit

Goal: minimize Android permissions and carry forward the release-readiness backlog before building a user-installable
package.

Must cover:

- internet/network state;
- location;
- clipboard;
- notifications, only if there is a real feature;
- file access/import/export;
- package visibility and deep links;
- user-facing permission rationale.
- live auth/login/logout behavior;
- runtime request and cancellation policy;
- cache policy matrix;
- mobile ergonomics;
- accessibility baseline;
- release checklist.

### Assignment 8: Android Project Scaffold

Goal: create the smallest permanent native project after the risky spikes pass. Disposable spike shells are allowed
for assignments 4 and 5.

Possible approaches:

- native Android WebView project inspired by IITC-CE mobile;
- Capacitor wrapper if the IRIS shell becomes a regular web build;
- TWA only if IRIS becomes a hosted PWA-style app.

Do not scaffold all options. Pick one.

### Assignment 9: Debug APK Build and Mobile Smoke Test

Goal: produce the first installable artifact for local testing.

Done when:

- debug APK builds from a documented command;
- APK installs on at least one physical Android device;
- login/map load works;
- pan/zoom, portal selection, COMM open, Draw Tools list, marker-heavy sheet, and import/export smoke paths are tested;
- mobile sheet height, sticky headers/footers, map gestures, long-press behavior, and dense portrait panels are checked;
- basic focus order, labels/titles, contrast, and reduced-motion expectations are checked;
- logs for WebView/runtime errors are captured.

### Assignment 10: Friend-Shared APK Release Plan

Goal: prepare the first friend-shared APK only after the debug APK proves useful.

Must cover:

- APK signing and keystore storage;
- version code/name policy;
- target SDK and min SDK policy, without treating Play submission as required yet;
- APK output and install instructions;
- CI/build machine requirements if builds will be repeated;
- privacy notes for friends/testers;
- rollback/update strategy.

Deferred until later:

- Play Console setup;
- store listing metadata;
- AAB-first release process;
- public review/policy checklist beyond what is needed for responsible friend testing.

## Validation Rules

- Do not start feature parity work inside Android until assignments 4 and 5 pass.
- Do not block APK readiness on more UI component extraction. Reopen shared UI only for a concrete mobile,
  accessibility, or CSS drift finding; follow [the architecture reference](../architecture.md).
- Do not create release signing material in this repo unless the storage policy is written first.
- Do not claim "APK ready" until an APK installs and runs on a real device.
- Keep Android work separate from UI extraction/source-layout cleanup.
- For code-changing IRIS work, run focused tests, `npm run check` (workspace lint/typechecks/tests, CSS lint, and
  workbench build), `npm run package`, and `git diff --check`. Add Android build/device checks when native code exists.
