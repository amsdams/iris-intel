# IRIS Android Spike APK

Disposable native Android/WebView proof on `feature/android-readiness`. Version **0.3.1-spike** loads bundled IRIS automatically on signed-in Intel,
with a stock-Intel recovery mode. Phone confirmed mode persistence, IRIS startup after reopen, and stock-dashboard
blocking on 0.3.0. Panel Back, rotation, restoring the open panel after Reload, and background/resume also passed.
Version 0.3.1 location prompt, permission acceptance, and successful positioning passed on phone.
Phone login and reopening without another login passed on 0.1.3;
0.2.0 displayed IRIS on the phone and the user accepted a quick smoke of inventory, layers, COMM, portal details, and missions.

## Build And Download

Use JDK 21 and an Android SDK with platform 36 and Build Tools 36.0.0. The root commands discover the normal macOS SDK
location and a registered JDK 21; `JAVA_HOME` and `ANDROID_HOME` override discovery. Gradle 8.14.3 and AGP 8.13.2 are pinned.
Gradle can install missing SDK components when the SDK licenses have been accepted. First build needs internet access.

```bash
npm run android:check
npm run serve
```

`android:check` runs the session/injection tests, native navigation/asset tests, Android lint, and debug APK assembly.
Gradle builds the existing web bundles and packages their scripts, CSS, images, and licenses from generated output.
Node 24 and `npm ci` are prerequisites; no generated web files are committed.
For subsequent build-only runs, use `npm run android:build`.

The server prints a phone URL (port 6969 by default; set `PORT` to override). Connect the phone to the same Wi-Fi as the Mac, open that URL, download the APK, and
allow installation from the browser when Android asks. If macOS asks about incoming connections, allow this local server.
Guest networks/VPNs may prevent devices from reaching each other. Stop the server with Ctrl+C after downloading.
The page lists generated Firefox XPI, Chrome ZIP, and APK artifacts only; repository and session files are not served.
`npm run android:serve` remains an alias. Missing artifacts show their build command; starting the server does not build.

Output: `app/build/outputs/apk/debug/app-debug.apk`. The download is named `iris-intel-test.apk`.
It is automatically debug-signed using the local Android debug key; no release signing material is stored in the repo.
Installable on Android 8.0/API 26 or newer. Later permanent-app minimum/version policy is undecided.
Keep the local debug key to install subsequent builds over this one without losing app data.

## Phone Check

1. Install the update over **IRIS Intel Test**, preserving its session. Open the app; sign in if needed.
   IRIS should start automatically, with **PASS: bundled IRIS UI, Leaflet runtime, and message round trip confirmed.**
2. Tap **Check session**: PASS requires a signed-in player plus a valid `getHasActiveSubscription` response.
   In **Diagnostics**, IRIS mode should show **Stock dashboard: blocked**.
3. Pan/zoom, select a portal, and open a panel. Android Back should close a portal image first, then the panel,
   then the selection. Back on the plain map backgrounds the app rather than revisiting sign-in.
4. Background/reopen the app and lock/unlock the phone; the map should remain usable. Try rotation too.
5. Tap **Stock Intel** to recover the original map; tap **IRIS** to switch back. Each opens a fresh page.
   **Reload** and force-stop/reopen preserve the selected mode. Finish in IRIS mode and verify automatic startup again.
6. On failure, use **Diagnostics → Copy**. It includes versions, hosts, mode, and fixed session/injection status messages;
   no cookies, tokens, player identity, full URLs, or response bodies. Share visible errors without authentication URLs.

For 0.3.1, use **Map → Controls → Locate** (the existing location action). The Android prompt should appear only
when locating, not at startup. Deny once and check that the map stays usable and reports permission denied; retry
and allow **While using the app** (approximate or precise). Expect the map to move to your location and show its
accuracy. If Android stops prompting after repeated denial, enable Location in Android’s app permissions and retry.
Location services must also be enabled on the phone. Check approximate access and rotation/navigation during a
prompt when convenient; a cancelled page request should require another tap after returning.

The permission flow follows Android’s [runtime location guidance](https://developer.android.com/develop/sensors-and-location/location/permissions/runtime)
and [WebChromeClient geolocation callback](https://developer.android.com/reference/android/webkit/WebChromeClient#onGeolocationPermissionsShowPrompt(java.lang.String,%20android.webkit.GeolocationPermissions.Callback)).

Login compatibility (since 0.1.3) keeps `accounts.google.com` and `accounts.youtube.com` in the same WebView as Intel and its authorization page.
It uses the updated IITC mobile user-agent workaround: remove the WebView marker and adjust a reduced Chrome version
ending in `.0.0.0` to `.0.0.1`, preserving the installed browser major version and device information.
This is a compatibility experiment, not a supported Google OAuth integration; Google's
[embedded-user-agent policy](https://developers.google.com/identity/protocols/oauth2/policies#use-secure-browsers)
prohibits this kind of embedded authorization, so it is not a permanent auth architecture or a distribution-ready solution.
Version 0.1.3 reached stock Intel without Chrome and stayed logged in after force-stop; the earlier recovered
0.1.2 session passed the authenticated probe. No credentials are copied to native code.
USB is optional; debug builds can also be inspected with Chrome DevTools and Android Studio Logcat.

## Ownership And Next Step

A native Activity owns the WebView, automatic signed-in injection, mode selection, lifecycle, and Back behavior.
Cookies/DOM storage stay in the WebView; cookies flush when pausing. WebView timers and native probe polling pause
in the background and resume on return. Timer suspension is process-wide; this spike owns a single WebView. Embedded top-level pages are restricted to Intel, `login.ingress.com`, `accounts.google.com`, `accounts.youtube.com`, and its named Niantic sign-in hosts; other HTTPS links open
in the browser. The app declares Internet and foreground coarse/fine location permissions. Version 0.3.1 enables
WebView geolocation and requests Android permission when the location action calls the web Geolocation API,
accepting approximate or precise access. Only the exact HTTPS Intel origin on an Intel top-level page is allowed.
Navigation, cancellation, and disposal discard pending page requests; WebView grants are not persisted separately
from Android permission. No background location permission or tracking service is added. File handling remains later work. Existing web clipboard copying
works on the phone for markers and portal titles; no additional native clipboard bridge was needed. Native clipboard
access only supports the explicit diagnostics Copy action.

IITC mobile comparison sources are `IITC_WebView.java`, `IITC_WebViewClient.java`, and the user-agent helpers in
`IITC_Mobile.java` under `reference/ingress-intel-total-conversion/mobile/`. Reused concepts: JavaScript/DOM storage,
cookie persistence, navigation ownership, and WebView lifecycle. The broad JavaScript interface, mixed/file access,
and entire mobile/plugin framework were not adopted. Only the narrow user-agent login workaround is now under test.

Native diagnostics evaluate a bundled probe only on the exact HTTPS Intel origin. Credentials stay inside that page's
same-origin request; no privileged native JavaScript bridge is installed. Navigation/disposal invalidates pending probe
callbacks. Request format mirrors `postIntelEndpoint`/`extractVersion` in the existing page runtime.

Bundled assets are served only under the reserved HTTPS Intel path `/__iris_android__/`; other Intel requests
keep their network owner. The host supplies an asset-base meta tag; no fake extension APIs or privileged JavaScript
bridge are installed. The read-only Draw Tools status request/reply proves the existing shell/runtime transport.
In IRIS mode, interception returns an empty response for the exact Intel `gen_dashboard_<hash>.js` entry, preventing
the stock dashboard runtime from starting while retaining its script-tag version metadata, inline player data, and
authenticated endpoints. Stock Intel mode permits the original script. This depends on Intel’s current bootstrap layout;
confirm the blocked diagnostic and map behavior on the phone. Back reaches IRIS through a cancelable DOM event,
without native access to component state.
Next: resolve outstanding platform/auth decisions before permanent Android packaging. Include Back from
image/selection/plain map in the next device regression check.
See the [APK plan](../../docs/iitc-iris/plans/android-apk-installable-plan.md).

Phone evidence (2026-10-20): early versions handed sign-in to Chrome, losing the WebView session.
Adding `login.ingress.com`, `accounts.google.com`, then `accounts.youtube.com` kept the complete flow embedded.
Version 0.1.3 reached stock Intel and persisted login across force-stop. Google Password Manager autofill remains
unresolved. Version 0.2.0 phone injection and the quick feature smoke passed. The native PASS label was not
separately reported; keep that diagnostic distinct from the accepted feature smoke.

Phone evidence (2026-10-21, 0.3.0): Stock Intel reopened in Stock Intel mode. After selecting IRIS, the user
closed/reopened the app, IRIS loaded automatically, and Diagnostics showed **Stock dashboard: blocked**.
The user also confirmed Back closes a panel, rotation follows the phone, and Reload restores the open panel.
The user subsequently confirmed the app remains responsive after the requested background/resume check.
Back from image/selection/plain map and the native round-trip PASS label remain unreported.

Phone evidence (2026-10-21, 0.3.1): the user received the location prompts, accepted access, and location was found.
Denial/retry, approximate-only access, and cancellation during navigation/rotation were not separately reported.
