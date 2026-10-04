# Android APK Installable Plan

## Plan Dashboard

Status: planning and research only. No IRIS Android project exists yet.

This plan answers what must be decided and proven before trying to create an installable Android APK/AAB. It is not a
refactoring plan, and it should not be mixed with UI extraction or source-layout cleanup.

### Done

- Repo search completed on 2026-10-04.
- No existing IRIS APK plan, Capacitor config, Cordova config, native Android module, or Android build script was found
  under `apps/iitc-iris`, `packages`, or `docs/iitc-iris`.
- Reference IITC-CE Android prior art exists under `reference/IITC-CE/mobile/` and
  `reference/ingress-intel-total-conversion/mobile/`.
- Current IRIS packaging is browser-extension packaging only:
  - `apps/iitc-iris/manifest.json`
  - `apps/iitc-iris/package.json`

### In Progress

- None.

### Todo

- First target decided: private/friends sideloadable APK. Store/Play distribution is deferred.
- Prove that IRIS can run inside the chosen Android shell before moving feature code.
- Audit and adapt extension-only assumptions.
- Bring forward the release/mobile must-haves from `../port-plan.md` and `../backlog.md`.
- Create signing, permissions, privacy, and release documentation before any release build.

## Current Repo Facts

IRIS is currently a Manifest V3 content-script extension. It injects `content.js` and CSS into
`https://intel.ingress.com/*`, exposes `page-map-runtime.js` as a web-accessible resource, and packages Chrome/Firefox
extension zips through Vite scripts.

No IRIS Android app currently exists. A direct APK build cannot be produced from the current `apps/iitc-iris` package
without adding a native Android wrapper or a web-app packaging path.

The reference IITC-CE mobile app is native Android/WebView prior art, not an IRIS implementation. It uses an Android
Gradle project, `org.exarhteam.iitc_mobile`, a WebView activity, native permissions, signing configs, and Android
resources. It is useful for architecture research, but it should not be copied wholesale without deciding how IRIS will
own injection, auth, storage, permissions, and releases.

## Distribution Decision

Choose one path before implementation.

| Path | Use When | Main Cost |
|---|---|---|
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

Use "assignment" as the single active-work term. Complete these in order unless a result invalidates the chosen path.

| # | Assignment | Status | Done When |
|---|---|---|---|
| 1 | Distribution decision | Done | First target is private/friends sideload APK; Play/store distribution is deferred. |
| 2 | Android prior-art audit | Todo | Reference IITC mobile files are summarized into reusable patterns and rejected patterns. |
| 3 | Runtime boundary audit | Todo | Every extension-only assumption has an owner, replacement, or explicit non-goal. |
| 4 | WebView auth spike | Todo | A minimal Android/WebView shell can load Intel, authenticate, and observe required cookies/tokens. |
| 5 | IRIS injection spike | Todo | A minimal IRIS bundle can load in the shell and exchange one map/runtime message. |
| 6 | Storage and asset strategy | Todo | Local storage, bundled assets, fixture paths, icons, imports/exports, and cache behavior are defined. |
| 7 | Permission, privacy, and release-readiness audit | Todo | Android permissions plus backlog must-haves are listed and minimized. |
| 8 | Android project scaffold | Todo | Native project exists only after assignments 4 and 5 pass. |
| 9 | Debug APK build and mobile smoke test | Todo | A signed debug APK installs and performs mobile/accessibility smoke paths on a real device. |
| 10 | Friend-shared APK release plan | Todo | APK signing, versioning, install notes, privacy notes, and update/rollback strategy are documented. |

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

Goal: list every current browser-extension assumption that blocks APK packaging.

Start with:

- `apps/iitc-iris/manifest.json`
- `apps/iitc-iris/package.json`
- `apps/iitc-iris/src/content.tsx`
- `apps/iitc-iris/src/page-map-runtime.ts`
- `apps/iitc-iris/src/shell/content-storage-settings.ts`
- `apps/iitc-iris/src/missions/missions-panel.tsx`

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
- login/auth flow reaches the map for an already authorized test account/device;
- cookies required by IRIS requests are visible through the chosen approach;
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

Goal: create the smallest native project after the risky spikes pass.

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
- Do not block APK readiness on more UI component extraction. Reopen
  `ui-component-library-plan.md` only for a concrete mobile/accessibility/CSS drift bug that needs a shared component.
- Do not create release signing material in this repo unless the storage policy is written first.
- Do not claim "APK ready" until an APK installs and runs on a real device.
- Keep Android work separate from UI extraction/source-layout cleanup.
- For code-changing IRIS work, still run focused tests plus `npm run typecheck:iitc-iris`, `npm run lint:iitc-iris`,
  `npm run package:iitc-iris`, and `git diff --check`.
