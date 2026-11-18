package io.github.amsdams.iris;

/** Owns a single WebView request while Android's permission dialog is open. Main-thread only. */
final class LocationPermissionFlow {
    interface Host {
        boolean isIntelPage();
        boolean hasLocationPermission();
        boolean canRequestLocationPermissions();
        void requestLocationPermissions();
    }

    interface Reply { void invoke(String origin, boolean allow, boolean retain); }

    private final Host host;
    private String origin;
    private Reply pending;
    private boolean requesting;
    private boolean deniedForPage;

    LocationPermissionFlow(Host host) { this.host = host; }

    void request(String requestedOrigin, Reply reply) {
        boolean intelOrigin = "https://intel.ingress.com".equals(requestedOrigin)
                || "https://intel.ingress.com/".equals(requestedOrigin)
                || "https://intel.ingress.com:443".equals(requestedOrigin)
                || "https://intel.ingress.com:443/".equals(requestedOrigin);
        if (!intelOrigin || !host.isIntelPage() || requesting) {
            reply.invoke(requestedOrigin, false, false);
        } else if (host.hasLocationPermission()) {
            deniedForPage = false;
            reply.invoke(requestedOrigin, true, false);
        } else if (deniedForPage || !host.canRequestLocationPermissions()) {
            deniedForPage = true;
            reply.invoke(requestedOrigin, false, true);
        } else {
            origin = requestedOrigin;
            pending = reply;
            requesting = true;
            host.requestLocationPermissions();
        }
    }

    void onPermissionResult() {
        requesting = false;
        if (pending == null) return;
        boolean allow = host.isIntelPage() && host.hasLocationPermission();
        deniedForPage = !allow;
        finish(allow);
    }

    // Navigation, prompt cancellation, or destruction must never grant a replacement document access.
    // Keep the Android request in flight until its result arrives, even if its WebView request was cancelled.
    void cancel() { pending = null; origin = null; }

    void onPageStarted() {
        cancel();
        deniedForPage = false;
    }

    private void finish(boolean allow) {
        Reply reply = pending;
        String requestedOrigin = origin;
        pending = null;
        origin = null;
        // Retain denials so WebView retries cannot reopen Android's permission Activity in a loop.
        // Positive grants remain transient, so OS permission is always checked before allowing access.
        if (reply != null) reply.invoke(requestedOrigin, allow, !allow);
    }
}
