package org.iris.intelspike;

/** Owns a single WebView request while Android's permission dialog is open. Main-thread only. */
final class LocationPermissionFlow {
    interface Host {
        boolean isIntelPage();
        boolean hasLocationPermission();
        void requestLocationPermissions();
    }

    interface Reply { void invoke(String origin, boolean allow, boolean retain); }

    private final Host host;
    private String origin;
    private Reply pending;
    private boolean requesting;

    LocationPermissionFlow(Host host) { this.host = host; }

    void request(String requestedOrigin, Reply reply) {
        boolean intelOrigin = "https://intel.ingress.com".equals(requestedOrigin)
                || "https://intel.ingress.com/".equals(requestedOrigin)
                || "https://intel.ingress.com:443".equals(requestedOrigin)
                || "https://intel.ingress.com:443/".equals(requestedOrigin);
        if (!intelOrigin || !host.isIntelPage() || requesting) {
            reply.invoke(requestedOrigin, false, false);
        } else if (host.hasLocationPermission()) {
            reply.invoke(requestedOrigin, true, false);
        } else {
            origin = requestedOrigin;
            pending = reply;
            requesting = true;
            host.requestLocationPermissions();
        }
    }

    void onPermissionResult() {
        requesting = false;
        finish(host.isIntelPage() && host.hasLocationPermission());
    }

    // Navigation, prompt cancellation, or destruction must never grant a replacement document access.
    // Keep the Android request in flight until its result arrives, even if its WebView request was cancelled.
    void cancel() { finish(false); }

    private void finish(boolean allow) {
        Reply reply = pending;
        String requestedOrigin = origin;
        pending = null;
        origin = null;
        // Recheck the OS grant every time rather than persisting a separate WebView permission.
        if (reply != null) reply.invoke(requestedOrigin, allow, false);
    }
}
