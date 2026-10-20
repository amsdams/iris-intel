# Intel Login Test APK

Disposable native Android/WebView proof on `feature/android-readiness`. It loads live Intel and checks login/request
behavior. It does not bundle or inject IRIS yet. A successful build is not proof that Intel sign-in works on a phone.

## Build And Download

Use JDK 21 and an Android SDK with platform 36 and Build Tools 36.0.0. The root commands discover the normal macOS SDK
location and a registered JDK 21; `JAVA_HOME` and `ANDROID_HOME` override discovery. Gradle 8.14.3 and AGP 8.13.2 are pinned.
Gradle can install missing SDK components when the SDK licenses have been accepted. First build needs internet access.

```bash
npm run android:check
npm run android:serve
```

`android:check` runs the session-probe tests, native navigation tests, Android lint, and debug APK assembly.
For subsequent build-only runs, use `npm run android:build`.

The server prints a phone URL (port 8787 by default; set `PORT` to override). Connect the phone to the same Wi-Fi as the Mac, open that URL, download the APK, and
allow installation from the browser when Android asks. If macOS asks about incoming connections, allow this local server.
Guest networks/VPNs may prevent devices from reaching each other. Stop the server with Ctrl+C after downloading.
Only the download page and APK are served, not the repository or any session data.

Output: `app/build/outputs/apk/debug/app-debug.apk`. The download is named `iris-intel-test.apk`.
It is automatically debug-signed using the local Android debug key; no release signing material is stored in the repo.
Installable on Android 8.0/API 26 or newer. Later permanent-app minimum/version policy is undecided.
Keep the local debug key to install subsequent builds over this one without losing app data.

## Phone Check

1. Launch **IRIS Intel Test** and sign in through the Intel page.
2. When the map is loaded, tap **Check session**. PASS requires an Intel player bootstrap and a successful, typed
   response from `getHasActiveSubscription`; being a paying subscriber is not required.
3. Close/reopen the app and check again; also test after removing it from Recents. Record whether sign-in persists.
4. Check Back navigation and background/resume. **Intel** returns to the start page; **Reload** retries loading.
5. If something fails, open **Diagnostics → Copy** and share the result. It contains versions, page host, last external host, and fixed
   status messages; it does not copy cookies, tokens, player identity, full URLs, or response bodies.

Version **0.1.3-spike** keeps `accounts.google.com` and `accounts.youtube.com` in the same WebView as Intel and its authorization page.
It uses the updated IITC mobile user-agent workaround: remove the WebView marker and adjust a reduced Chrome version
ending in `.0.0.0` to `.0.0.1`, preserving the installed browser major version and device information.
This is a compatibility experiment, not a supported Google OAuth integration; Google's
[embedded-user-agent policy](https://developers.google.com/identity/protocols/oauth2/policies#use-secure-browsers)
prohibits this kind of embedded authorization, so it is not a permanent auth architecture or a distribution-ready solution.
One phone session reached Intel and passed the authenticated probe after a 400 error and manual Intel-button recovery.
Repeatable sign-in and persistence still need testing. No credentials are copied to native code.
USB is optional; debug builds can also be inspected with Chrome DevTools and Android Studio Logcat.

## Ownership And Next Step

A native Activity owns the WebView, lifecycle, and Back behavior. Cookies/DOM storage stay in the WebView, flushed when
pausing. Embedded top-level pages are restricted to Intel, `login.ingress.com`, `accounts.google.com`, `accounts.youtube.com`, and its named Niantic sign-in hosts; other HTTPS links open
in the browser. The app requests Internet access only. Location, clipboard integration for the web page, file handling,
and IRIS runtime injection remain later work. Native clipboard access only supports the explicit diagnostics Copy action.

IITC mobile comparison sources are `IITC_WebView.java`, `IITC_WebViewClient.java`, and the user-agent helpers in
`IITC_Mobile.java` under `reference/ingress-intel-total-conversion/mobile/`. Reused concepts: JavaScript/DOM storage,
cookie persistence, navigation ownership, and WebView lifecycle. The broad JavaScript interface, mixed/file access,
and entire mobile/plugin framework were not adopted. Only the narrow user-agent login workaround is now under test.

Native diagnostics evaluate a bundled probe only on the exact HTTPS Intel origin. Credentials stay inside that page's
same-origin request; no privileged native JavaScript bridge is installed. Navigation/disposal invalidates pending probe
callbacks. Request format mirrors `postIntelEndpoint`/`extractVersion` in the existing page runtime.

The next deliverable is bundled IRIS assets plus a message round trip, after the supported auth/session path is proven.
See the [APK plan](../../docs/iitc-iris/plans/android-apk-installable-plan.md).

First phone test (2026-10-20): APK installs, but sign-in leaves the app and returns to the login page in Chrome.
Version 0.1.1 keeps the current `login.ingress.com` authorization page embedded (missing in the first build).
Google still opens externally; this correction alone does not establish a working Google session handoff.
The updated upstream IITC reference at `c33820e7` keeps Google embedded and rewrites the user agent; version 0.1.2 now tests that workaround.
The user confirmed `accounts.google.com` was the external host in 0.1.1.

Version 0.1.2 phone result: account selection stayed embedded, followed by a reported 400 / malformed-URL error.
Tapping Intel recovered to the stock map and Check session returned PASS. Saved-password selection was unavailable.
Retest persistence before resetting: remove from Recents/reopen, then force-stop/reopen and check the session each time.
For a fresh login, use Android app settings → IRIS Intel Test → Storage → Clear storage/data (not just cache).
This removes the spike’s local session; repeat sign-in and capture Diagnostics plus the visible error text before
tapping Intel if the 400 returns. Do not share full authentication URLs, passwords, or tokens.

The repeated 0.1.2 test identified `accounts.youtube.com` as the external host while the embedded page stayed on
`accounts.google.com`. Version 0.1.3 keeps that exact additional login host embedded, matching upstream IITC.
The user confirmed the 0.1.3 retest stayed in the app and reached the stock Intel map.
Check session on this build and persistence across force-stop/relaunch remain to be confirmed.
