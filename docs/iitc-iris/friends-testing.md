# IRIS Friends Testing

IRIS is an independent Ingress Intel companion based on IITC, currently an early Android alpha.
Start with 2–5 trusted players who are comfortable installing an APK. Play Store distribution is deferred.
Google sign-in uses an experimental embedded-browser workaround; saved-password support remains unresolved.

## Install And Try

Download **iitc-iris-android.apk**, the signed APK from the maintainer. Published versions are available from
[GitHub Releases](https://github.com/amsdams/iris-intel/releases/latest); a local test build may be newer.
Use the same signing key for updates and install over the existing release to retain your session/settings.
Only the first move from a debug APK needs uninstalling, which clears app data. Android 8 or newer is required.

1. Open **IRIS**, sign in, and check that the IRIS map appears.
2. Try portal details, COMM, inventory, map styles, copying a portal title, and **Map → Controls → Locate**.
   Location permission is optional; denying it should keep the app usable.
3. In **System → Appearance**, try System/Dark/Light. Reload and check your choice persists.
   The theme affects the interface; choose the map style separately in **Map → Display**.
   The Android header/dialogs follow the device appearance. The initial interface theme remains Dark.
4. Close/reopen, try Android Back, and use the app during normal play over a few days.
   If multiple tracked players share a last-seen location, try the count marker and each agent's history.

## Recovery And Feedback

**App → Reload** reloads the current mode. **App → Recovery → Stock Intel** opens the original Intel map;
choose **IRIS** in that menu to return. The selected mode survives closing/reopening.

**App → About IRIS** shows the version, Privacy, and Feedback (opens GitHub Issues in your browser).
Report the version, phone/Android version, steps, expected result, and what happened. Review screenshots and
**App → Diagnostics → Copy** before sending them; avoid private portal information and account details.
Never include passwords, cookies, or tokens. Diagnostics contain fixed status messages and hosts, without full URLs
or account identities. **Check session** runs a probe; reopen Diagnostics to read its result.

## Data Use

IRIS operates no analytics/crash-reporting backend. Reports/diagnostics are shared only when you send them.
Intel and authentication contact Niantic and the sign-in provider. WebView retains cookies and local settings;
IRIS does not send them to an IRIS-operated server. Map requests contact OpenStreetMap or OpenFreeMap and their
resources; address searches send the query to OpenStreetMap Nominatim. Those services receive network information
including IP address and requested map areas. Portal/mission images use their supplied hosts.

Locate requests foreground location when tapped; it centers the map, whose requests can reveal that area to the map
provider. IRIS requests no background location permission. Preferences, map view, and drawn links/markers stay local;
explicit Copy actions use the device clipboard. Clear Android app storage or uninstall to remove local app data;
Intel logout preserves preferences. Contact the maintainer through the project's GitHub Issues for privacy questions.
The same information is available offline from **App → About IRIS → Privacy**.
