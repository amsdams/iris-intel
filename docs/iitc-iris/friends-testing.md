# IRIS Friends Testing

IRIS is an independent Ingress Intel companion based on IITC, currently an early Android alpha.
GitHub APKs and a Google Play internal test are available; broader Play distribution is still being prepared.
Google sign-in uses an experimental embedded-browser workaround; saved-password support remains unresolved.

## Install And Try

Download **iitc-iris-android.apk**, the signed APK from the maintainer. Published versions are available from
[GitHub Releases](https://github.com/amsdams/iris-intel/releases/latest); a local test build may be newer.
Updates with the same application ID and signing key retain your session/settings. Android 8 or newer is required.

On 2026-10-29 the permanent package changed to `io.github.amsdams.iris`. Users of the old `org.iris.intelspike` alpha
must download the new APK manually from Releases; it installs separately and requires signing in again. Preferences
and drawings do not transfer automatically. Keep the old app until you have copied any drawings you want to retain;
both apps have the IRIS launcher name. Its update checker rejects the new app's metadata. Subsequent updates to the
new app work normally. Switching debug/release signing for the same ID requires uninstalling, which clears app data.

1. Open **IRIS**, sign in, and check that the IRIS map appears.
2. Try portal details, COMM, inventory, map styles, copying a portal title, and **Map → Controls → Locate**.
   Location permission is optional; denying it should keep the app usable.
3. In **System → Appearance**, try System/Dark/Light for the interface and choose a base map.
   The two choices are independent. Reload and check both choices persist.
   The Android header/dialogs follow the device appearance. The initial interface theme remains Dark.
4. Close/reopen, try Android Back, and use the app during normal play over a few days.
   If multiple tracked players share a last-seen location, try the count marker and each agent's history.

## Updates

Use **App → Check for updates** to compare your installed Android build with the latest published main-build APK.
An available update offers **Releases**, which opens the GitHub release page; download the signed APK and install it
over the existing app. **App → Releases** opens that page directly. Updates are checked only when requested;
there are no background checks, automatic APK downloads, or automatic installation.
A local build may be newer than GitHub. If the check fails, use Releases or try again later.
The first release containing this feature must be published before its version metadata is available.

## Recovery And Feedback

**App → Reload** reloads the current mode. **App → Recovery → Stock Intel** opens the original Intel map;
choose **IRIS** in that menu to return. The selected mode survives closing/reopening.

**App → About IRIS** shows the version, Privacy, and Feedback (opens GitHub Issues in your browser).
Report the version, phone/Android version, steps, expected result, and what happened. Review screenshots and
**App → Diagnostics → Copy** before sending them; avoid private portal information and account details.
Never include passwords, cookies, or tokens. Diagnostics contain fixed status messages and hosts, without full URLs
or account identities. **Check session** runs a probe; reopen Diagnostics to read its result.

## Data Use

The manual update check fetches public version metadata from GitHub without Intel cookies or account details;
GitHub receives the network request, including your IP address. Releases/Feedback open GitHub in your browser.
IRIS operates no analytics/crash-reporting backend. Reports/diagnostics are shared only when you send them.
Intel and authentication contact Niantic and the sign-in provider. WebView retains cookies and local settings;
IRIS does not send them to an IRIS-operated server. Map requests contact OpenStreetMap or OpenFreeMap and their
resources; address searches send the query to OpenStreetMap Nominatim. Those services receive network information
including IP address and requested map areas. Portal/mission images use their supplied hosts.

Locate requests foreground location when tapped; it centers the map, whose requests can reveal that area to the map
provider. IRIS requests no background location permission. Preferences, map view, and drawn links/markers stay local;
explicit Copy actions use the device clipboard. Clear Android app storage or uninstall to remove local app data;
Intel logout preserves preferences. Contact [1sos.2play@gmail.com](mailto:1sos.2play@gmail.com) for support,
privacy questions or requests about information you sent to the maintainer. GitHub issues may be public.
The [full privacy policy](https://amsdams.github.io/iris-intel/privacy/) covers retention, deletion and service providers.
An offline summary and an Online policy link are available from **App → About IRIS → Privacy**.
